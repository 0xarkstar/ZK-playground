"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  Info,
  ExternalLink,
  Grid3X3,
  Shield,
  Loader2,
  RefreshCw,
  Clock,
  Lock,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { groth16 } from "snarkjs";
import {
  SUDOKU_VERIFIER_ABI,
  SUDOKU_APP_ABI,
  SUDOKU_VERIFIER_BYTECODE,
  SUDOKU_APP_BYTECODE,
  SUDOKU_WASM_PATH,
  SUDOKU_ZKEY_PATH,
} from "@/lib/web3/contracts";

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
}

// Sample Sudoku puzzles (0 = empty cell)
const SAMPLE_PUZZLES = [
  {
    name: "Easy",
    puzzle: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ],
  },
];

const CONTRACT_CONFIG: DemoContractConfig = {
  name: "SudokuVerifier",
  verifierAbi: SUDOKU_VERIFIER_ABI,
  verifierBytecode: SUDOKU_VERIFIER_BYTECODE as `0x${string}`,
  appAbi: SUDOKU_APP_ABI,
  appBytecode: SUDOKU_APP_BYTECODE as `0x${string}`,
  verifierLabel: "Groth16Verifier",
  appLabel: "SudokuVerifier",
};

export default function SudokuPage() {
  const t = useTranslations("demo.sudoku");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [appAddress, setAppAddress] = useState<string | null>(null);

  // Puzzle state
  const [selectedPuzzle] = useState(SAMPLE_PUZZLES[0]);
  const [userSolution, setUserSolution] = useState<number[][]>(
    JSON.parse(JSON.stringify(SAMPLE_PUZZLES[0].puzzle))
  );

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

  // Check if solution is complete
  function isSolutionComplete(): boolean {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (!userSolution[i][j] || userSolution[i][j] < 1 || userSolution[i][j] > 9) {
          return false;
        }
      }
    }
    return true;
  }

  // Count filled cells
  function countFilledCells(): number {
    let count = 0;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (userSolution[i][j] >= 1 && userSolution[i][j] <= 9) {
          count++;
        }
      }
    }
    return count;
  }

  // Refresh contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !appContract) return;

    setIsRefreshing(true);
    try {
      const total = await publicClient.readContract({
        address: appContract,
        abi: SUDOKU_APP_ABI,
        functionName: "totalVerifications",
      });
      setStats({ totalVerifications: Number(total as bigint) });
    } catch (err) {
      // Contract may not have this function, ignore
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

  // Update cell value
  const updateCell = useCallback(
    (row: number, col: number, value: string) => {
      const num = parseInt(value, 10);
      if (value === "" || (num >= 1 && num <= 9)) {
        const newSolution = userSolution.map((r, i) =>
          r.map((c, j) => (i === row && j === col ? (value === "" ? 0 : num) : c))
        );
        setUserSolution(newSolution);
      }
    },
    [userSolution]
  );

  // Auto-fill solution
  const autoFillSolution = useCallback(() => {
    setUserSolution(JSON.parse(JSON.stringify(selectedPuzzle.solution)));
  }, [selectedPuzzle]);

  // Reset puzzle
  const resetPuzzle = useCallback(() => {
    setUserSolution(JSON.parse(JSON.stringify(selectedPuzzle.puzzle)));
    setProof(null);
    setTxHash(null);
    setIsVerified(false);
    setError(null);
    setProgress(0);
    setStep("");
  }, [selectedPuzzle]);

  // Generate proof
  const generateProof = useCallback(async () => {
    if (!isSolutionComplete()) {
      setError("Please complete the puzzle first");
      return;
    }

    setIsGeneratingProof(true);
    setError(null);
    setProgress(0);

    try {
      setStep(t("steps.checkingClues"));
      setProgress(20);

      const input = {
        solution: userSolution,
        puzzle: selectedPuzzle.puzzle,
      };

      setStep(t("steps.generatingProof"));
      setProgress(50);

      const { proof: generatedProof, publicSignals } = await groth16.fullProve(
        input,
        SUDOKU_WASM_PATH,
        SUDOKU_ZKEY_PATH
      );

      setStep(t("steps.verified") || "Complete");
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
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsGeneratingProof(false);
    }
  }, [userSolution, selectedPuzzle, t]);

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

      const pubSignals = proof.pubSignals.map((s) => BigInt(s)) as [
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
      ];

      const hash = await walletClient.writeContract({
        address: appContract,
        abi: SUDOKU_APP_ABI,
        functionName: "verifySolution",
        args: [pA, pB, pC, pubSignals],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setIsVerified(true);
      refreshContractState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit proof");
    } finally {
      setIsSubmitting(false);
    }
  }, [walletClient, publicClient, appContract, proof, refreshContractState]);

  const solutionComplete = isSolutionComplete();
  const currentStep = !appAddress ? 0 : !solutionComplete ? 1 : !proof ? 2 : !isVerified ? 3 : 4;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") },
    { step: 1, name: t("progress.solvePuzzle") },
    { step: 2, name: t("progress.generateProof") },
    { step: 3, name: t("progress.submitProof") },
    { step: 4, name: t("steps.verified") || "Complete" },
  ];

  // Render Sudoku grid
  const renderGrid = () => {
    return (
      <div className="grid gap-0.5 bg-border p-0.5 rounded-lg w-fit mx-auto">
        {Array.from({ length: 9 }, (_, row) => (
          <div key={row} className="flex gap-0.5">
            {Array.from({ length: 9 }, (_, col) => {
              const isClue = selectedPuzzle.puzzle[row][col] !== 0;
              const borderRight = col === 2 || col === 5 ? "border-r-2 border-border" : "";
              const borderBottom = row === 2 || row === 5 ? "border-b-2 border-border" : "";

              return (
                <div key={col} className={`${borderRight} ${borderBottom}`}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={userSolution[row][col] || ""}
                    onChange={(e) => updateCell(row, col, e.target.value)}
                    disabled={isClue}
                    className={`w-10 h-10 text-center p-0 text-lg font-medium ${
                      isClue ? "bg-muted text-foreground font-bold" : "bg-background"
                    }`}
                    maxLength={1}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
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
              <TabsTrigger value="demo">{t("tabs.demo") || "Demo"}</TabsTrigger>
              <TabsTrigger value="how">{t("tabs.howItWorks") || "How It Works"}</TabsTrigger>
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
                  {/* Step 1: Solve Puzzle */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5" />
                        {t("step1.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {renderGrid()}

                      <div className="flex justify-center gap-4">
                        <Button onClick={autoFillSolution} variant="outline">
                          <Sparkles className="mr-2 h-4 w-4" />
                          {t("step1.autoFill")}
                        </Button>
                        <Button onClick={resetPuzzle} variant="outline">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t("step1.reset")}
                        </Button>
                      </div>

                      {solutionComplete && (
                        <Alert className="border-green-500">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <AlertTitle>{t("step1.complete")}</AlertTitle>
                          <AlertDescription>{t("step1.completeDesc")}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  {/* Step 2: Generate Proof */}
                  {solutionComplete && (
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
                          <Lock className="h-5 w-5" />
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
                            <Button onClick={resetPuzzle} variant="secondary" className="w-full">
                              {t("step1.reset") || "Try Again"}
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
                                <Lock className="h-4 w-4 mr-2" />
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
                    <Badge variant="outline">{t("privacy.tags.solutionHidden")}</Badge>
                    <Badge variant="outline">{t("privacy.tags.validityProven")}</Badge>
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
                <span>{t("stats.title") || "Stats"}</span>
                <Button variant="ghost" size="sm" onClick={refreshContractState} disabled={!appAddress || isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.totalVerifications") || "Total Verifications"}</span>
                <Badge variant="secondary">{stats.totalVerifications}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.cellsFilled") || "Cells Filled"}</span>
                <Badge variant="secondary">{countFilledCells()}/81</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.puzzleComplete") || "Puzzle Complete"}</span>
                <Badge variant={solutionComplete ? "default" : "secondary"}>{solutionComplete ? "Yes" : "No"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.proofGenerated") || "Proof Generated"}</span>
                <Badge variant={proof ? "default" : "secondary"}>{proof ? "Yes" : "No"}</Badge>
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
