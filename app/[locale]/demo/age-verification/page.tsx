"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GenericContractDeployer,
  DemoContractConfig,
} from "@/components/demo/GenericContractDeployer";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletBalance, FaucetLink } from "@/components/demo/WalletBalance";
import { LiveBadge } from "@/components/demo/LiveBadge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  Calendar,
  Shield,
  Loader2,
  RefreshCw,
  Clock,
  UserCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
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

const CONTRACT_CONFIG: DemoContractConfig = {
  name: "AgeVerifier",
  verifierAbi: AGE_VERIFICATION_VERIFIER_ABI,
  verifierBytecode: AGE_VERIFICATION_VERIFIER_BYTECODE as `0x${string}`,
  appAbi: AGE_VERIFIER_APP_ABI,
  appBytecode: AGE_VERIFIER_APP_BYTECODE as `0x${string}`,
  verifierLabel: "Groth16Verifier",
  appLabel: "AgeVerifier",
};

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
  const [identityCommitment, setIdentityCommitment] = useState<string | null>(null);

  // Proof state
  const [proof, setProof] = useState<ProofData | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  // On-chain state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats
  const [stats, setStats] = useState({ totalVerifications: 0 });

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isGeneratingProof) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGeneratingProof]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const appContract = appAddress as `0x${string}` | null;

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

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    return calculatedAge;
  }, [birthYear, birthMonth, birthDay]);

  // Refresh contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !appContract) return;

    setIsRefreshing(true);
    try {
      const total = await publicClient.readContract({
        address: appContract,
        abi: AGE_VERIFIER_APP_ABI,
        functionName: "totalVerifications",
      });
      setStats({ totalVerifications: Number(total as bigint) });
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, appContract]);

  useEffect(() => {
    if (appContract) {
      refreshContractState();
    }
  }, [appContract, refreshContractState]);

  // Handle deployment
  const handleDeployed = (verifier: string, app: string) => {
    setVerifierAddress(verifier);
    setAppAddress(app);
  };

  // Compute identity commitment
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
      setIdentityCommitment(bigintToHex(hash));
      setAge(calculateAge());
    } catch (err) {
      console.error("Failed to compute identity commitment:", err);
    }
  }, [birthYear, birthMonth, birthDay, calculateAge]);

  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      computeIdentityCommitment();
    }
  }, [birthYear, birthMonth, birthDay, computeIdentityCommitment]);

  // Generate proof
  const generateProof = useCallback(async () => {
    if (!identityCommitment || age === null) {
      setError("Please enter a valid birthdate first");
      return;
    }

    const threshold = parseInt(ageThreshold, 10);
    if (isNaN(threshold) || threshold < 0) {
      setError("Please enter a valid age threshold");
      return;
    }

    setIsGeneratingProof(true);
    setError(null);
    setProgress(0);

    try {
      const currentYear = new Date().getFullYear();
      const year = parseInt(birthYear, 10);
      const month = parseInt(birthMonth, 10);
      const day = parseInt(birthDay, 10);

      setStep(t("steps.hashingBirthdate"));
      setProgress(20);

      const input = {
        age: age,
        birthYear: year,
        birthMonth: month,
        birthDay: day,
        ageThreshold: threshold,
        currentYear: currentYear,
        identityCommitment: BigInt(identityCommitment).toString(),
      };

      setStep(t("steps.generatingProof"));
      setProgress(50);

      const { proof: generatedProof, publicSignals } = await groth16.fullProve(
        input,
        AGE_VERIFICATION_WASM_PATH,
        AGE_VERIFICATION_ZKEY_PATH
      );

      setStep(t("steps.complete"));
      setProgress(100);

      setProof({
        pA: [generatedProof.pi_a[0], generatedProof.pi_a[1]] as [string, string],
        pB: [
          [generatedProof.pi_b[0][1], generatedProof.pi_b[0][0]],
          [generatedProof.pi_b[1][1], generatedProof.pi_b[1][0]],
        ] as [[string, string], [string, string]],
        pC: [generatedProof.pi_c[0], generatedProof.pi_c[1]] as [string, string],
        pubSignals: publicSignals,
      });
    } catch (err) {
      console.error("Proof generation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsGeneratingProof(false);
    }
  }, [identityCommitment, age, ageThreshold, birthYear, birthMonth, birthDay, t]);

  // Submit proof on-chain
  const submitProof = useCallback(async () => {
    if (!walletClient || !publicClient || !appContract || !proof) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const pA: [bigint, bigint] = [BigInt(proof.pA[0]), BigInt(proof.pA[1])];
      const pB: [[bigint, bigint], [bigint, bigint]] = [
        [BigInt(proof.pB[0][0]), BigInt(proof.pB[0][1])],
        [BigInt(proof.pB[1][0]), BigInt(proof.pB[1][1])],
      ];
      const pC: [bigint, bigint] = [BigInt(proof.pC[0]), BigInt(proof.pC[1])];

      const minAge = BigInt(proof.pubSignals[0]);
      const currentDate = BigInt(proof.pubSignals[1]);
      const idCommitment = BigInt(proof.pubSignals[2]);

      const hash = await walletClient.writeContract({
        address: appContract,
        abi: AGE_VERIFIER_APP_ABI,
        functionName: "verifyAge",
        args: [pA, pB, pC, minAge, currentDate, idCommitment],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setIsVerified(true);
      refreshContractState();
    } catch (err) {
      console.error("Submission failed:", err);
      setError(err instanceof Error ? err.message : "Failed to submit proof");
    } finally {
      setIsSubmitting(false);
    }
  }, [walletClient, publicClient, appContract, proof, refreshContractState]);

  // Reset demo
  const resetDemo = useCallback(() => {
    setBirthYear("");
    setBirthMonth("");
    setBirthDay("");
    setAge(null);
    setIdentityCommitment(null);
    setProof(null);
    setTxHash(null);
    setIsVerified(false);
    setError(null);
    setProgress(0);
    setStep("");
  }, []);

  const meetsThreshold = age !== null && age >= parseInt(ageThreshold || "0");
  const currentStep = !appAddress ? 0 : !identityCommitment ? 1 : !proof ? 2 : !isVerified ? 3 : 4;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") },
    { step: 1, name: t("progress.enterBirthdate") },
    { step: 2, name: t("progress.generateProof") },
    { step: 3, name: t("progress.submitProof") },
    { step: 4, name: t("steps.complete") || "Complete" },
  ];

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
          <Alert>
            <Info className="h-4 w-4" />
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
              <TabsTrigger value="demo">Demo</TabsTrigger>
              <TabsTrigger value="how">{t("howItWorks.title")}</TabsTrigger>
            </TabsList>

            <TabsContent value="demo" className="space-y-4">
              {/* Contract Deployment */}
              <GenericContractDeployer
                config={CONTRACT_CONFIG}
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
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">{t("step1.description")}</p>
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
                        <Label htmlFor="ageThreshold">{t("step1.thresholdLabel")}</Label>
                        <Input
                          id="ageThreshold"
                          type="number"
                          placeholder="18"
                          value={ageThreshold}
                          onChange={(e) => setAgeThreshold(e.target.value)}
                          min="0"
                          max="150"
                        />
                        <p className="text-xs text-muted-foreground">{t("step1.thresholdHint")}</p>
                      </div>

                      {age !== null && (
                        <div className={`p-4 rounded-lg ${meetsThreshold ? "bg-green-50 dark:bg-green-950 border border-green-500" : "bg-red-50 dark:bg-red-950 border border-red-500"}`}>
                          <div className="flex items-center gap-2">
                            {meetsThreshold ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-medium">
                              {meetsThreshold ? t("step1.eligible") : t("step1.notEligible")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("step1.calculatedAge", { age })}
                            {meetsThreshold
                              ? ` ${t("step1.meetsThreshold", { threshold: ageThreshold })}`
                              : ` ${t("step1.belowThreshold", { threshold: ageThreshold })}`}
                          </p>
                        </div>
                      )}

                      {identityCommitment && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">{t("step1.identityCommitment")}</div>
                          <code className="text-xs break-all font-mono">{identityCommitment}</code>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Step 2: Generate Proof */}
                  {identityCommitment && meetsThreshold && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          {t("step2.title")}
                        </CardTitle>
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
                              <div className="text-sm font-medium">{step}</div>
                              <Progress value={progress} className="h-2" />
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{t("steps.generatingProof")}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(elapsedTime)}
                                </span>
                              </div>
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
                              <p className="text-sm text-muted-foreground">{t("proofReadyToSubmit")}</p>
                            </motion.div>
                          ) : (
                            <Button onClick={generateProof} className="w-full">
                              <Shield className="h-4 w-4 mr-2" />
                              {t("generateProofButton")}
                            </Button>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 3: Submit On-Chain */}
                  {proof && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5" />
                          {t("onchain.title")}
                        </CardTitle>
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
                              Try Again
                            </Button>
                          </div>
                        ) : (
                          <Button onClick={submitProof} disabled={isSubmitting} className="w-full">
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t("onchain.submitting")}
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                {t("onchain.submitButton")}
                              </>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>{t("result.failed")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
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
                      <h4 className="font-semibold">{t("privacy.title")}</h4>
                      <p className="text-sm text-muted-foreground">{t("privacy.description")}</p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold">{t("howItWorks.step1.title")}</h4>
                      <p className="text-sm text-muted-foreground">{t("howItWorks.step1.description")}</p>
                      <h4 className="font-semibold">{t("howItWorks.step2.title")}</h4>
                      <p className="text-sm text-muted-foreground">{t("howItWorks.step2.description")}</p>
                      <h4 className="font-semibold">{t("howItWorks.step3.title")}</h4>
                      <p className="text-sm text-muted-foreground">{t("howItWorks.step3.description")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{t("privacy.tags.zeroKnowledge")}</Badge>
                    <Badge variant="outline">{t("privacy.tags.rangeProof")}</Badge>
                    <Badge variant="outline">{t("privacy.tags.noAgeRevealed")}</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                      {currentStep > item.step ? <CheckCircle2 className="h-4 w-4" /> : item.step}
                    </div>
                    <span className={currentStep >= item.step ? "font-medium" : "text-muted-foreground"}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Stats</span>
                <Button variant="ghost" size="sm" onClick={refreshContractState} disabled={!appAddress || isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Verifications</span>
                <Badge variant="secondary">{stats.totalVerifications}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your Age</span>
                <Badge variant={age !== null ? "default" : "secondary"}>{age ?? "-"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Threshold</span>
                <Badge variant="secondary">{ageThreshold}+</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Eligible</span>
                <Badge variant={meetsThreshold ? "default" : "destructive"}>{meetsThreshold ? "Yes" : "No"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("contractInfo.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("contractInfo.network")}:</span>
                <Badge variant="outline" className="ml-2">Base Sepolia</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.verifier")}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {verifierAddress || "Not deployed"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.appContract")}:</span>
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
