"use client";

import { useState, useCallback, useEffect } from "react";
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
  Calendar,
  Shield,
  ExternalLink,
  FileCheck,
  ShieldCheck,
  UserCheck,
  Clock,
  Wallet,
  Info,
} from "lucide-react";
import { groth16 } from "snarkjs";
import { poseidonHash, bigintToHex } from "@/lib/zk/poseidon";
import {
  AGE_VERIFICATION_VERIFIER_ABI,
  AGE_VERIFIER_APP_ABI,
  AGE_VERIFICATION_VERIFIER_BYTECODE,
  AGE_VERIFIER_APP_BYTECODE,
  AGE_VERIFICATION_WASM_PATH,
  AGE_VERIFICATION_ZKEY_PATH,
} from "@/lib/web3/contracts";

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
}

export default function AgeVerificationPage() {
  const t = useTranslations("demo.ageVerification");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [appAddress, setAppAddress] = useState<string | null>(null);

  // Form state
  const [birthYear, setBirthYear] = useState<string>("");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthDay, setBirthDay] = useState<string>("");
  const [ageThreshold, setAgeThreshold] = useState<string>("18");

  // Computed values
  const [age, setAge] = useState<number | null>(null);
  const [identityCommitment, setIdentityCommitment] = useState<string | null>(
    null
  );

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
    name: "AgeVerifier",
    verifierAbi: AGE_VERIFICATION_VERIFIER_ABI,
    verifierBytecode: AGE_VERIFICATION_VERIFIER_BYTECODE as `0x${string}`,
    appAbi: AGE_VERIFIER_APP_ABI,
    appBytecode: AGE_VERIFIER_APP_BYTECODE as `0x${string}`,
    verifierLabel: "Groth16Verifier",
    appLabel: "AgeVerifier",
  };

  const steps = [
    { label: t("progress.deployContracts"), completed: !!appAddress },
    { label: t("progress.enterBirthdate"), completed: !!identityCommitment },
    { label: t("progress.generateProof"), completed: !!proof },
    { label: t("progress.submitProof"), completed: isVerified === true },
  ];

  // Handle deployment complete
  const handleDeployed = useCallback(
    (verifier: string, app: string) => {
      setVerifierAddress(verifier);
      setAppAddress(app);
      setCurrentStep(1);
    },
    []
  );

  // Calculate age from birthdate
  const calculateAge = useCallback(() => {
    const year = parseInt(birthYear, 10);
    const month = parseInt(birthMonth, 10);
    const day = parseInt(birthDay, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      calculatedAge--;
    }

    return calculatedAge;
  }, [birthYear, birthMonth, birthDay]);

  // Compute identity commitment when birthdate changes
  const computeIdentityCommitment = useCallback(async () => {
    const year = parseInt(birthYear, 10);
    const month = parseInt(birthMonth, 10);
    const day = parseInt(birthDay, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      setIdentityCommitment(null);
      setAge(null);
      return;
    }

    try {
      const hash = await poseidonHash([BigInt(year), BigInt(month), BigInt(day)]);
      const hashHex = bigintToHex(hash);
      setIdentityCommitment(hashHex);
      setAge(calculateAge());
      if (appAddress) setCurrentStep(1);
    } catch (err) {
      console.error("Failed to compute identity commitment:", err);
      setIdentityCommitment(null);
    }
  }, [birthYear, birthMonth, birthDay, calculateAge, appAddress]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      computeIdentityCommitment();
    }
  }, [birthYear, birthMonth, birthDay, computeIdentityCommitment]);

  // Generate ZK proof
  const generateProof = useCallback(async () => {
    if (!identityCommitment || age === null) {
      setProofError("Please enter a valid birthdate first");
      return;
    }

    const threshold = parseInt(ageThreshold, 10);
    if (isNaN(threshold) || threshold < 0) {
      setProofError("Please enter a valid age threshold");
      return;
    }

    setIsGeneratingProof(true);
    setProofError(null);
    setProof(null);
    const startTime = Date.now();

    try {
      const currentYear = new Date().getFullYear();
      const year = parseInt(birthYear, 10);
      const month = parseInt(birthMonth, 10);
      const day = parseInt(birthDay, 10);

      const input = {
        age: age,
        birthYear: year,
        birthMonth: month,
        birthDay: day,
        ageThreshold: threshold,
        currentYear: currentYear,
        identityCommitment: BigInt(identityCommitment).toString(),
      };

      const { proof: generatedProof, publicSignals } = await groth16.fullProve(
        input,
        AGE_VERIFICATION_WASM_PATH,
        AGE_VERIFICATION_ZKEY_PATH
      );

      setProof({
        pA: [generatedProof.pi_a[0], generatedProof.pi_a[1]] as [string, string],
        pB: [
          [generatedProof.pi_b[0][1], generatedProof.pi_b[0][0]],
          [generatedProof.pi_b[1][1], generatedProof.pi_b[1][0]],
        ] as [[string, string], [string, string]],
        pC: [generatedProof.pi_c[0], generatedProof.pi_c[1]] as [string, string],
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
  }, [identityCommitment, age, ageThreshold, birthYear, birthMonth, birthDay]);

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
      // Format proof for contract (already formatted when stored)
      const pA: [bigint, bigint] = [
        BigInt(proof.pA[0]),
        BigInt(proof.pA[1]),
      ];
      const pB: [[bigint, bigint], [bigint, bigint]] = [
        [BigInt(proof.pB[0][0]), BigInt(proof.pB[0][1])],
        [BigInt(proof.pB[1][0]), BigInt(proof.pB[1][1])],
      ];
      const pC: [bigint, bigint] = [
        BigInt(proof.pC[0]),
        BigInt(proof.pC[1]),
      ];

      // Public signals: [ageThreshold, currentYear, identityCommitment]
      const minAge = BigInt(proof.pubSignals[0]);
      const currentDate = BigInt(proof.pubSignals[1]);
      const idCommitment = BigInt(proof.pubSignals[2]);

      const hash = await walletClient.writeContract({
        address: appAddress as `0x${string}`,
        abi: AGE_VERIFIER_APP_ABI,
        functionName: "verifyAge",
        args: [pA, pB, pC, minAge, currentDate, idCommitment],
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

  const meetsThreshold = age !== null && age >= parseInt(ageThreshold || "0");

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
              {/* Step 1: Enter Birthdate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t("step1.title")}
                  </CardTitle>
                  <CardDescription>{t("step1.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birthYear">{t("step1.yearLabel")}</Label>
                      <Input
                        id="birthYear"
                        type="number"
                        placeholder="1990"
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        min="1900"
                        max={new Date().getFullYear()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthMonth">{t("step1.monthLabel")}</Label>
                      <Input
                        id="birthMonth"
                        type="number"
                        placeholder="1-12"
                        value={birthMonth}
                        onChange={(e) => setBirthMonth(e.target.value)}
                        min="1"
                        max="12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDay">{t("step1.dayLabel")}</Label>
                      <Input
                        id="birthDay"
                        type="number"
                        placeholder="1-31"
                        value={birthDay}
                        onChange={(e) => setBirthDay(e.target.value)}
                        min="1"
                        max="31"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ageThreshold">
                      {t("step1.thresholdLabel")}
                    </Label>
                    <Input
                      id="ageThreshold"
                      type="number"
                      placeholder="18"
                      value={ageThreshold}
                      onChange={(e) => setAgeThreshold(e.target.value)}
                      min="0"
                      max="150"
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("step1.thresholdHint")}
                    </p>
                  </div>

                  {age !== null && (
                    <Alert
                      variant={meetsThreshold ? "default" : "destructive"}
                      className={meetsThreshold ? "border-green-500" : ""}
                    >
                      {meetsThreshold ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {meetsThreshold
                          ? t("step1.eligible")
                          : t("step1.notEligible")}
                      </AlertTitle>
                      <AlertDescription>
                        {t("step1.calculatedAge", { age })}
                        {meetsThreshold
                          ? ` ${t("step1.meetsThreshold", {
                              threshold: ageThreshold,
                            })}`
                          : ` ${t("step1.belowThreshold", {
                              threshold: ageThreshold,
                            })}`}
                      </AlertDescription>
                    </Alert>
                  )}

                  {identityCommitment && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">
                        {t("step1.identityCommitment")}
                      </p>
                      <code className="text-xs break-all">
                        {identityCommitment}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Generate Proof */}
              {identityCommitment && meetsThreshold && (
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
                  <UserCheck className="h-4 w-4 text-primary" />
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
                <Badge variant="outline">{t("privacy.tags.rangeProof")}</Badge>
                <Badge variant="outline">
                  {t("privacy.tags.noAgeRevealed")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
