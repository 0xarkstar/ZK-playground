"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Grid3X3,
  ExternalLink,
  FileCheck,
  ShieldCheck,
  Clock,
  Wallet,
  RefreshCw,
} from "lucide-react";
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
    name: "SudokuVerifier",
    verifierAbi: SUDOKU_VERIFIER_ABI,
    verifierBytecode: SUDOKU_VERIFIER_BYTECODE as `0x${string}`,
    appAbi: SUDOKU_APP_ABI,
    appBytecode: SUDOKU_APP_BYTECODE as `0x${string}`,
    verifierLabel: "Groth16Verifier",
    appLabel: "SudokuVerifier",
  };

  const steps = [
    { label: t("progress.deployContracts"), completed: !!appAddress },
    { label: t("progress.solvePuzzle"), completed: isSolutionComplete() },
    { label: t("progress.generateProof"), completed: !!proof },
    { label: t("progress.submitProof"), completed: isVerified === true },
  ];

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

  // Handle deployment complete
  const handleDeployed = useCallback((verifier: string, app: string) => {
    setVerifierAddress(verifier);
    setAppAddress(app);
    setCurrentStep(1);
  }, []);

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
    setCurrentStep(1);
  }, [selectedPuzzle]);

  // Reset puzzle
  const resetPuzzle = useCallback(() => {
    setUserSolution(JSON.parse(JSON.stringify(selectedPuzzle.puzzle)));
    setProof(null);
    setProofError(null);
    setTxHash(null);
    setIsVerified(null);
    setOnchainError(null);
    setCurrentStep(appAddress ? 1 : 0);
  }, [selectedPuzzle, appAddress]);

  // Generate ZK proof
  const generateProof = useCallback(async () => {
    if (!isSolutionComplete()) {
      setProofError("Please complete the puzzle first");
      return;
    }

    setIsGeneratingProof(true);
    setProofError(null);
    setProof(null);
    const startTime = Date.now();

    try {
      const input = {
        solution: userSolution,
        puzzle: selectedPuzzle.puzzle,
      };

      const { proof: generatedProof, publicSignals } = await groth16.fullProve(
        input,
        SUDOKU_WASM_PATH,
        SUDOKU_ZKEY_PATH
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
  }, [userSolution, selectedPuzzle]);

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

      // Public signals: 81 puzzle cells + 1 solution commitment = 82 signals
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
        address: appAddress as `0x${string}`,
        abi: SUDOKU_APP_ABI,
        functionName: "verifySolution",
        args: [pA, pB, pC, pubSignals],
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
                <div
                  key={col}
                  className={`${borderRight} ${borderBottom}`}
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={userSolution[row][col] || ""}
                    onChange={(e) => updateCell(row, col, e.target.value)}
                    disabled={isClue}
                    className={`w-10 h-10 text-center p-0 text-lg font-medium ${
                      isClue
                        ? "bg-muted text-foreground font-bold"
                        : "bg-background"
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
              {/* Step 1: Solve Puzzle */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    {t("step1.title")}
                  </CardTitle>
                  <CardDescription>{t("step1.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renderGrid()}

                  <div className="flex justify-center gap-4">
                    <Button onClick={autoFillSolution} variant="outline">
                      {t("step1.autoFill")}
                    </Button>
                    <Button onClick={resetPuzzle} variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("step1.reset")}
                    </Button>
                  </div>

                  {isSolutionComplete() && (
                    <Alert className="border-green-500">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertTitle>{t("step1.complete")}</AlertTitle>
                      <AlertDescription>
                        {t("step1.completeDesc")}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Generate Proof */}
              {isSolutionComplete() && (
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
                  <Grid3X3 className="h-4 w-4 text-primary" />
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
                  {t("privacy.tags.solutionHidden")}
                </Badge>
                <Badge variant="outline">
                  {t("privacy.tags.validityProven")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
