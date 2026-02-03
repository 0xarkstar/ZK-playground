"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const { isConnected } = useAccount();
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
  const [proofProgress, setProofProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stats and refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalVerifications: 0 });

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

  const appContract = appAddress as `0x${string}` | null;

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Dynamic current step calculation
  const currentStep = !appAddress
    ? 0
    : !credentialHash
    ? 1
    : !proof
    ? 2
    : !isVerified
    ? 3
    : 4;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") },
    { step: 1, name: t("progress.setupCredential") },
    { step: 2, name: t("progress.generateProof") },
    { step: 3, name: t("progress.submitProof") },
    { step: 4, name: t("progress.verified") },
  ];

  // Refresh contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !appContract) return;

    setIsRefreshing(true);
    try {
      const total = await publicClient.readContract({
        address: appContract,
        abi: CREDENTIAL_VERIFIER_APP_ABI,
        functionName: "totalVerifications",
      });
      setStats({ totalVerifications: Number(total as bigint) });
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, appContract]);

  // Refresh on contract deployment
  useEffect(() => {
    if (appContract) {
      refreshContractState();
    }
  }, [appContract, refreshContractState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle deployment complete
  const handleDeployed = useCallback((verifier: string, app: string) => {
    setVerifierAddress(verifier);
    setAppAddress(app);
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
    } catch {
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
    setProofProgress(0);
    setElapsedTime(0);

    // Start timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      setProofProgress((prev) => Math.min(prev + 2, 95));
    }, 100);

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
      setProofProgress(100);
    } catch (err) {
      setProofError(
        err instanceof Error ? err.message : "Failed to generate proof"
      );
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
        refreshContractState();
      } else {
        setIsVerified(false);
        setOnchainError("Transaction failed");
      }
    } catch (err) {
      setOnchainError(
        err instanceof Error ? err.message : "Failed to submit proof on-chain"
      );
      setIsVerified(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [proof, walletClient, publicClient, appAddress, refreshContractState]);

  // Reset demo
  const resetDemo = useCallback(() => {
    setCredentialType("1");
    setMinAttribute("1");
    setCredentialHash(null);
    setIssuerPublicKey(null);
    setProof(null);
    setProofError(null);
    setProofTime(null);
    setTxHash(null);
    setIsVerified(null);
    setOnchainError(null);
    setProofProgress(0);
    setElapsedTime(0);
  }, []);

  // Get credential type label
  const getCredentialTypeLabel = (value: string) => {
    return (
      CREDENTIAL_TYPES.find((type) => type.value === value)?.label || "Unknown"
    );
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Testnet Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("realBlockchainAlert.title")}</AlertTitle>
            <AlertDescription>
              {t("realBlockchainAlert.description")} <FaucetLink />.
            </AlertDescription>
          </Alert>

          {/* Wallet Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t("walletConnection")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConnectButton chainStatus="icon" showBalance={false} />
              {isConnected && <WalletBalance />}
            </CardContent>
          </Card>

          <Tabs defaultValue="demo" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="demo">{t("tabs.demo") || "Demo"}</TabsTrigger>
              <TabsTrigger value="how">
                {t("tabs.howItWorks") || "How It Works"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demo" className="space-y-4">
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
                      <CardDescription>
                        {t("step1.description")}
                      </CardDescription>
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

                      <Button
                        onClick={computeCredentialCommitment}
                        disabled={!!credentialHash}
                        className="w-full"
                      >
                        <GraduationCap className="mr-2 h-4 w-4" />
                        {credentialHash
                          ? t("step1.setupComplete") || "Credential Setup Complete"
                          : t("step1.setupButton")}
                      </Button>

                      {credentialHash && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-3 p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium mb-1">
                              {t("step1.credentialHash")}
                            </p>
                            <code className="text-xs break-all">
                              {credentialHash}
                            </code>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">
                              {t("step1.issuerKey")}
                            </p>
                            <code className="text-xs break-all">
                              {issuerPublicKey}
                            </code>
                          </div>
                        </motion.div>
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
                        <CardDescription>
                          {t("step2.description")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <AnimatePresence mode="wait">
                          {isGeneratingProof ? (
                            <motion.div
                              key="generating"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="space-y-3"
                            >
                              <div className="flex justify-between text-sm">
                                <span>{t("steps.generatingProof")}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(elapsedTime)}
                                </span>
                              </div>
                              <Progress value={proofProgress} />
                            </motion.div>
                          ) : proof ? (
                            <motion.div
                              key="complete"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="space-y-3"
                            >
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-medium">{t("proofGenerated")}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {t("proofReadyToSubmit")}
                                {proofTime && (
                                  <span className="ml-2">
                                    ({t("result.proofTime")}: {proofTime}ms)
                                  </span>
                                )}
                              </p>
                            </motion.div>
                          ) : (
                            <Button onClick={generateProof} className="w-full">
                              <FileCheck className="h-4 w-4 mr-2" />
                              {t("generateProofButton")}
                            </Button>
                          )}
                        </AnimatePresence>

                        {proofError && (
                          <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>{t("result.failed")}</AlertTitle>
                            <AlertDescription>{proofError}</AlertDescription>
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
                        <CardDescription>
                          {t("onchain.description")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {isVerified ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-5 w-5" />
                              <span className="font-medium">{t("onchain.verified")}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{t("onchain.verifiedDesc")}</p>
                            {txHash && (
                              <a
                                href={`https://sepolia.basescan.org/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="outline" size="sm" className="w-full">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  {t("onchain.viewTransaction")}
                                </Button>
                              </a>
                            )}
                            <Button onClick={resetDemo} variant="secondary" className="w-full">
                              {t("resetButton") || "Try Again"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={submitProofOnChain}
                            disabled={isSubmitting}
                            className="w-full"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {txHash
                                  ? t("onchain.waiting")
                                  : t("onchain.submitting")}
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                {t("onchain.submitButton")}
                              </>
                            )}
                          </Button>
                        )}

                        {onchainError && (
                          <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertTitle>{t("onchain.failed")}</AlertTitle>
                            <AlertDescription>{onchainError}</AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="how" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("howItWorks.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        {t("privacy.title")}
                      </h4>
                      <p className="text-sm text-muted-foreground">{t("privacy.description")}</p>
                    </div>
                    <div className="space-y-4">
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
                    </div>
                  </div>
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
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("progress.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressSteps.map((item) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        currentStep > item.step
                          ? "bg-green-500 text-white"
                          : currentStep === item.step
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentStep > item.step ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        item.step
                      )}
                    </div>
                    <span
                      className={
                        currentStep >= item.step
                          ? "font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>{t("stats.title") || "Stats"}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshContractState}
                  disabled={!appAddress || isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("stats.totalVerifications") || "Total Verifications"}
                </span>
                <Badge variant="secondary">{stats.totalVerifications}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("stats.credentialType") || "Credential Type"}
                </span>
                <span className="font-medium">
                  {getCredentialTypeLabel(credentialType)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("stats.minLevel") || "Min Level"}
                </span>
                <span className="font-medium">{minAttribute}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("stats.credentialSetup") || "Credential Setup"}
                </span>
                <Badge variant={credentialHash ? "default" : "secondary"}>
                  {credentialHash ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("stats.proofGenerated") || "Proof Generated"}
                </span>
                <Badge variant={proof ? "default" : "secondary"}>
                  {proof ? "Yes" : "No"}
                </Badge>
              </div>
              {proofTime && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("stats.proofTime") || "Proof Time"}
                  </span>
                  <span className="font-medium">{proofTime}ms</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("contractInfo.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t("contractInfo.network")}:
                </span>
                <Badge variant="outline" className="ml-2">
                  Base Sepolia
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("contractInfo.verifier")}:
                </span>
                <div className="font-mono text-xs mt-1 break-all">
                  {verifierAddress || "Not deployed"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("contractInfo.appContract")}:
                </span>
                <div className="font-mono text-xs mt-1 break-all">
                  {appAddress || "Not deployed"}
                </div>
              </div>
              {appAddress && (
                <a
                  href={`https://sepolia.basescan.org/address/${appAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Basescan
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
