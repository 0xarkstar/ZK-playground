"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from "next-intl";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import {
  GenericContractDeployer,
  DemoContractConfig,
} from "@/components/demo/GenericContractDeployer";
import { WalletBalance, FaucetLink } from "@/components/demo/WalletBalance";
import { LiveBadge } from "@/components/demo/LiveBadge";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Award,
  ExternalLink,
  FileCheck,
  ShieldCheck,
  Clock,
  Wallet,
  GraduationCap,
} from "lucide-react";
import { groth16 } from "snarkjs";
import { poseidonHash, bigintToHex } from "@/lib/zk/poseidon";
import {
  CREDENTIAL_PROOF_VERIFIER_ABI,
  CREDENTIAL_VERIFIER_APP_ABI,
  CREDENTIAL_PROOF_VERIFIER_BYTECODE,
  CREDENTIAL_VERIFIER_APP_BYTECODE,
  CREDENTIAL_PROOF_WASM_PATH,
  CREDENTIAL_PROOF_ZKEY_PATH,
} from "@/lib/web3/contracts";

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
}

// Credential types
const CREDENTIAL_TYPES = [
  { value: "1", label: "University Degree" },
  { value: "2", label: "Professional Certificate" },
  { value: "3", label: "Skill Certification" },
];

// Sample credential data
const SAMPLE_CREDENTIAL = {
  subjectId: "12345678901234567890",
  credentialType: "1",
  issueDate: Math.floor(Date.now() / 1000) - 86400 * 365, // 1 year ago
  expiryDate: 0, // Never expires
  attribute1: "4", // e.g., degree level (1=Associate, 2=Bachelor, 3=Master, 4=PhD)
  attribute2: "100", // e.g., GPA * 10
  issuerSecret: "987654321098765432109876543210",
};

export default function CredentialPage() {
  const t = useTranslations("demo.credential");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [appAddress, setAppAddress] = useState<string | null>(null);

  // Form state
  const [credentialType, setCredentialType] = useState<string>("1");
  const [minAttribute, setMinAttribute] = useState<string>("1");

  // Computed values
  const [credentialHash, setCredentialHash] = useState<string | null>(null);
  const [issuerPublicKey, setIssuerPublicKey] = useState<string | null>(null);

  // Proof state
  const [proof, setProof] = useState<ProofData | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [proofTime, setProofTime] = useState<number | null>(null);

  // On-chain state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [onchainError, setOnchainError] = useState<string | null>(null);

  // Progress tracking
  const [currentStep, setCurrentStep] = useState(0);

  // Contract config for deployer
  const contractConfig: DemoContractConfig = {
    name: "CredentialVerifier",
    verifierAbi: CREDENTIAL_PROOF_VERIFIER_ABI,
    verifierBytecode: CREDENTIAL_PROOF_VERIFIER_BYTECODE as `0x${string}`,
    appAbi: CREDENTIAL_VERIFIER_APP_ABI,
    appBytecode: CREDENTIAL_VERIFIER_APP_BYTECODE as `0x${string}`,
    verifierLabel: "Groth16Verifier",
    appLabel: "CredentialVerifier",
  };

  const steps = [
    { label: t("progress.deployContracts"), completed: !!appAddress },
    { label: t("progress.setupCredential"), completed: !!credentialHash },
    { label: t("progress.generateProof"), completed: !!proof },
    { label: t("progress.submitProof"), completed: isVerified === true },
  ];

  // Handle deployment complete
  const handleDeployed = useCallback((verifier: string, app: string) => {
    setVerifierAddress(verifier);
    setAppAddress(app);
    setCurrentStep(1);
  }, []);

  // Compute credential hash and issuer public key
  const computeCredentialCommitment = useCallback(async () => {
    try {
      const cred = SAMPLE_CREDENTIAL;

      // Compute credential hash: Poseidon(subjectId, type, issueDate, expiryDate, attr1, attr2)
      const credHash = await poseidonHash([
        BigInt(cred.subjectId),
        BigInt(credentialType),
        BigInt(cred.issueDate),
        BigInt(cred.expiryDate),
        BigInt(cred.attribute1),
        BigInt(cred.attribute2),
      ]);

      // Compute issuer public key: Poseidon(credentialHash, issuerSecret)
      const issuerPubKey = await poseidonHash([
        credHash,
        BigInt(cred.issuerSecret),
      ]);

      setCredentialHash(bigintToHex(credHash));
      setIssuerPublicKey(bigintToHex(issuerPubKey));
      setCurrentStep(1);
    } catch (err) {
      console.error("Failed to compute credential commitment:", err);
      setProofError("Failed to compute credential commitment");
    }
  }, [credentialType]);

  // Generate ZK proof
  const generateProof = useCallback(async () => {
    if (!credentialHash || !issuerPublicKey) {
      setProofError("Please setup credential first");
      return;
    }

    setIsGeneratingProof(true);
    setProofError(null);
    setProof(null);
    const startTime = Date.now();

    try {
      const cred = SAMPLE_CREDENTIAL;
      const currentTime = Math.floor(Date.now() / 1000);

      const input = {
        subjectId: cred.subjectId,
        credentialType: credentialType,
        issueDate: cred.issueDate.toString(),
        expiryDate: cred.expiryDate.toString(),
        attribute1: cred.attribute1,
        attribute2: cred.attribute2,
        issuerSecret: cred.issuerSecret,
        credentialHash: BigInt(credentialHash).toString(),
        issuerPublicKey: BigInt(issuerPublicKey).toString(),
        currentTime: currentTime.toString(),
        requiredType: credentialType,
        minAttribute1: minAttribute,
      };

      const { proof: generatedProof, publicSignals } = await groth16.fullProve(
        input,
        CREDENTIAL_PROOF_WASM_PATH,
        CREDENTIAL_PROOF_ZKEY_PATH
      );

      setProof({
        pA: [generatedProof.pi_a[0], generatedProof.pi_a[1]] as [
          string,
          string
        ],
        pB: [
          [generatedProof.pi_b[0][1], generatedProof.pi_b[0][0]],
          [generatedProof.pi_b[1][1], generatedProof.pi_b[1][0]],
        ] as [[string, string], [string, string]],
        pC: [generatedProof.pi_c[0], generatedProof.pi_c[1]] as [
          string,
          string
        ],
        pubSignals: publicSignals,
      });
      setProofTime(Date.now() - startTime);
      setCurrentStep(2);
    } catch (err) {
      console.error("Proof generation failed:", err);
      setProofError(
        err instanceof Error ? err.message : "Failed to generate proof"
      );
    } finally {
      setIsGeneratingProof(false);
    }
  }, [credentialHash, issuerPublicKey, credentialType, minAttribute]);

  // Submit proof on-chain
  const submitProofOnChain = useCallback(async () => {
    if (!proof || !walletClient || !publicClient || !appAddress) {
      setOnchainError("Missing required data for on-chain submission");
      return;
    }

    setIsSubmitting(true);
    setOnchainError(null);
    setTxHash(null);
    setIsVerified(null);

    try {
      // Format proof for contract
      const pA: [bigint, bigint] = [BigInt(proof.pA[0]), BigInt(proof.pA[1])];
      const pB: [[bigint, bigint], [bigint, bigint]] = [
        [BigInt(proof.pB[0][0]), BigInt(proof.pB[0][1])],
        [BigInt(proof.pB[1][0]), BigInt(proof.pB[1][1])],
      ];
      const pC: [bigint, bigint] = [BigInt(proof.pC[0]), BigInt(proof.pC[1])];

      // Generate a unique nullifier for this verification
      const nullifier = BigInt(
        "0x" +
          Array.from(crypto.getRandomValues(new Uint8Array(31)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
      );

      // Public signals from circuit: [credentialHash, issuerPublicKey, currentTime, requiredType, minAttribute1]
      // Contract expects: [credentialType, threshold, issuerPubkey, nullifier, merkleRoot]
      // We map them for the contract call
      const hash = await walletClient.writeContract({
        address: appAddress as `0x${string}`,
        abi: CREDENTIAL_VERIFIER_APP_ABI,
        functionName: "verifyCredential",
        args: [
          pA,
          pB,
          pC,
          BigInt(proof.pubSignals[3]), // requiredType -> credentialType
          BigInt(proof.pubSignals[4]), // minAttribute1 -> threshold
          BigInt(proof.pubSignals[1]), // issuerPublicKey
          nullifier, // nullifier
          BigInt(proof.pubSignals[0]), // credentialHash -> merkleRoot
        ],
      });

      setTxHash(hash);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        setIsVerified(true);
        setCurrentStep(3);
      } else {
        setIsVerified(false);
        setOnchainError("Transaction failed");
      }
    } catch (err) {
      console.error("On-chain submission failed:", err);
      setOnchainError(
        err instanceof Error ? err.message : "Failed to submit proof on-chain"
      );
      setIsVerified(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [proof, walletClient, publicClient, appAddress]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary">{t("badge")}</Badge>
          <LiveBadge />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">{t("description")}</p>
      </div>

      {/* Wallet Connection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t("walletConnection")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("realBlockchainAlert.title")}</AlertTitle>
            <AlertDescription>
              {t("realBlockchainAlert.description")}
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <ConnectButton />
            {isConnected && (
              <div className="flex items-center gap-4">
                <WalletBalance />
                <FaucetLink />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Deployment */}
          <GenericContractDeployer
            config={contractConfig}
            onDeployed={handleDeployed}
            isDeployed={!!appAddress}
            verifierAddress={verifierAddress}
            appAddress={appAddress}
          />

          {appAddress && (
            <>
              {/* Step 1: Setup Credential */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    {t("step1.title")}
                  </CardTitle>
                  <CardDescription>{t("step1.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="credentialType">
                      {t("step1.typeLabel")}
                    </Label>
                    <Select
                      value={credentialType}
                      onValueChange={setCredentialType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDENTIAL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minAttribute">
                      {t("step1.minLevelLabel")}
                    </Label>
                    <Input
                      id="minAttribute"
                      type="number"
                      placeholder="1"
                      value={minAttribute}
                      onChange={(e) => setMinAttribute(e.target.value)}
                      min="1"
                      max="10"
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("step1.minLevelHint")}
                    </p>
                  </div>

                  <Button onClick={computeCredentialCommitment} className="w-full">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    {t("step1.setupButton")}
                  </Button>

                  {credentialHash && (
                    <div className="space-y-3 p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm font-medium mb-1">
                          {t("step1.credentialHash")}
                        </p>
                        <code className="text-xs break-all">{credentialHash}</code>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">
                          {t("step1.issuerKey")}
                        </p>
                        <code className="text-xs break-all">{issuerPublicKey}</code>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Generate Proof */}
              {credentialHash && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5" />
                      {t("step2.title")}
                    </CardTitle>
                    <CardDescription>{t("step2.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={generateProof}
                      disabled={isGeneratingProof}
                      className="w-full"
                    >
                      {isGeneratingProof ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("steps.generatingProof")}
                        </>
                      ) : (
                        t("generateProofButton")
                      )}
                    </Button>

                    {proofError && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>{t("result.failed")}</AlertTitle>
                        <AlertDescription>{proofError}</AlertDescription>
                      </Alert>
                    )}

                    {proof && (
                      <Alert className="border-green-500">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertTitle>{t("proofGenerated")}</AlertTitle>
                        <AlertDescription>
                          {t("proofReadyToSubmit")}
                          {proofTime && (
                            <span className="ml-2 text-muted-foreground">
                              ({t("result.proofTime")}: {proofTime}ms)
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Submit On-Chain */}
              {proof && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      {t("onchain.title")}
                    </CardTitle>
                    <CardDescription>{t("onchain.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={submitProofOnChain}
                      disabled={isSubmitting || isVerified === true}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {txHash
                            ? t("onchain.waiting")
                            : t("onchain.submitting")}
                        </>
                      ) : isVerified === true ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {t("onchain.verified")}
                        </>
                      ) : (
                        t("onchain.submitButton")
                      )}
                    </Button>

                    {onchainError && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>{t("onchain.failed")}</AlertTitle>
                        <AlertDescription>{onchainError}</AlertDescription>
                      </Alert>
                    )}

                    {isVerified === true && txHash && (
                      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertTitle>{t("onchain.verified")}</AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>{t("onchain.verifiedDesc")}</p>
                          <a
                            href={`https://sepolia.basescan.org/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            {t("onchain.viewTransaction")}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("progress.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step.completed
                          ? "bg-green-500 text-white"
                          : index === currentStep
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={
                        step.completed
                          ? "text-green-600 dark:text-green-400"
                          : ""
                      }
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contract Info */}
          {appAddress && (
            <Card>
              <CardHeader>
                <CardTitle>{t("contractInfo.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">
                    {t("contractInfo.network")}
                  </p>
                  <p className="font-medium">Base Sepolia</p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("contractInfo.verifier")}
                  </p>
                  <code className="text-xs break-all">{verifierAddress}</code>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("contractInfo.appContract")}
                  </p>
                  <code className="text-xs break-all">{appAddress}</code>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("contractInfo.owner")}
                  </p>
                  <code className="text-xs break-all">{address}</code>
                </div>
              </CardContent>
            </Card>
          )}

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>{t("howItWorks.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("howItWorks.step1.title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("howItWorks.step1.description")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("howItWorks.step2.title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("howItWorks.step2.description")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t("howItWorks.step3.title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("howItWorks.step3.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Guarantee */}
          <Card>
            <CardHeader>
              <CardTitle>{t("privacy.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {t("privacy.description")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {t("privacy.tags.zeroKnowledge")}
                </Badge>
                <Badge variant="outline">
                  {t("privacy.tags.identityHidden")}
                </Badge>
                <Badge variant="outline">
                  {t("privacy.tags.qualificationProven")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
