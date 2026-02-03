"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GenericContractDeployer, DemoContractConfig } from "@/components/demo/GenericContractDeployer";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletBalance, FaucetLink } from "@/components/demo/WalletBalance";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  CheckCircle2,
  Info,
  ExternalLink,
  RefreshCw,
  Gamepad2,
  Shield,
  CheckCircle,
  Loader2,
  Eye,
  EyeOff,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
  Play,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LiveBadge } from "@/components/demo/LiveBadge";
import { poseidonHash, generateIdentitySecret } from "@/lib/zk/poseidon";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import {
  MASTERMIND_WASM_PATH,
  MASTERMIND_ZKEY_PATH,
  MASTERMIND_VKEY_PATH,
  VERIFIER_ABI,
  MASTERMIND_GAME_ABI,
  MASTERMIND_VERIFIER_BYTECODE,
  MASTERMIND_GAME_BYTECODE,
} from "@/lib/web3/contracts";

const COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];
const COLOR_EMOJIS = ["R", "O", "Y", "G", "B", "P"];

interface Guess {
  colors: number[];
  blackPegs: number;
  whitePegs: number;
  verified: boolean;
  txHash?: string;
}

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
}

const mastermindConfig: DemoContractConfig = {
  name: "Mastermind",
  verifierAbi: VERIFIER_ABI,
  verifierBytecode: MASTERMIND_VERIFIER_BYTECODE,
  appAbi: MASTERMIND_GAME_ABI,
  appBytecode: MASTERMIND_GAME_BYTECODE,
  verifierLabel: "Mastermind Verifier",
  appLabel: "Mastermind Game",
};

export default function MastermindDemoPage() {
  const t = useTranslations("demo.mastermind");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [gameAddress, setGameAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [secretCode, setSecretCode] = useState<number[]>([0, 1, 2, 3]);
  const [codeSalt, setCodeSalt] = useState<bigint | null>(null);
  const [codeCommitment, setCodeCommitment] = useState<bigint | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [currentGuess, setCurrentGuess] = useState<number[]>([0, 0, 0, 0]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [gameWon, setGameWon] = useState(false);

  // UI state
  const [isCommitting, setIsCommitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latestProof, setLatestProof] = useState<ProofData | null>(null);
  const [showProofDetails, setShowProofDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const gameContract = gameAddress as `0x${string}` | null;

  // Timer for proof generation
  useEffect(() => {
    if (isVerifying) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isVerifying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Fetch contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !gameContract) return;

    setIsRefreshing(true);
    try {
      const [active, owner, commitment, guessCount] = await Promise.all([
        publicClient.readContract({
          address: gameContract,
          abi: MASTERMIND_GAME_ABI,
          functionName: "gameActive",
        }),
        publicClient.readContract({
          address: gameContract,
          abi: MASTERMIND_GAME_ABI,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: gameContract,
          abi: MASTERMIND_GAME_ABI,
          functionName: "codeCommitment",
        }),
        publicClient.readContract({
          address: gameContract,
          abi: MASTERMIND_GAME_ABI,
          functionName: "guessCount",
        }),
      ]);

      setGameActive(active as boolean);
      setIsOwner(address?.toLowerCase() === (owner as string)?.toLowerCase());

      const commitmentBigInt = BigInt(commitment as string);
      if (commitmentBigInt !== BigInt(0)) {
        setCodeCommitment(commitmentBigInt);
      }
    } catch (err) {
      console.error("Failed to refresh contract state:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, gameContract, address]);

  useEffect(() => {
    if (gameContract) {
      refreshContractState();
    }
  }, [gameContract, refreshContractState]);

  // Handle contract deployment
  const handleDeployed = (verifier: string, game: string) => {
    setVerifierAddress(verifier);
    setGameAddress(game);
    setIsOwner(true);
  };

  // Commit code on-chain
  const commitCode = async () => {
    if (!walletClient || !publicClient || !gameContract) return;

    setIsCommitting(true);
    setProgress(0);
    setError(null);

    try {
      setStep(t("steps.generatingSalt"));
      setProgress(20);

      const salt = generateIdentitySecret();
      setCodeSalt(salt);

      setStep(t("steps.computingCommitment"));
      setProgress(40);

      const commitment = await poseidonHash([
        BigInt(secretCode[0]),
        BigInt(secretCode[1]),
        BigInt(secretCode[2]),
        BigInt(secretCode[3]),
        salt,
      ]);

      setStep(t("steps.submittingOnChain"));
      setProgress(60);

      const commitmentBytes = ("0x" + commitment.toString(16).padStart(64, "0")) as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: gameContract,
        abi: MASTERMIND_GAME_ABI,
        functionName: "startGame",
        args: [commitmentBytes],
      });

      setStep(t("steps.waitingConfirmation"));
      setProgress(80);

      await publicClient.waitForTransactionReceipt({ hash });

      setStep(t("steps.complete"));
      setProgress(100);

      setCodeCommitment(commitment);
      setGameActive(true);
      setGuesses([]);
      setGameWon(false);
      setLatestProof(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setIsCommitting(false);
    }
  };

  // Submit guess and generate proof
  const submitGuess = async () => {
    if (!codeCommitment || !codeSalt || !walletClient || !publicClient || !gameContract) return;

    setIsVerifying(true);
    setProgress(0);
    setError(null);
    setLatestProof(null);

    try {
      // Compute black and white pegs
      setStep(t("steps.computingHint"));
      setProgress(10);

      let blackPegs = 0;
      const secretCounts = Array(6).fill(0);
      const guessCounts = Array(6).fill(0);

      for (let i = 0; i < 4; i++) {
        if (currentGuess[i] === secretCode[i]) {
          blackPegs++;
        } else {
          secretCounts[secretCode[i]]++;
          guessCounts[currentGuess[i]]++;
        }
      }

      let whitePegs = 0;
      for (let i = 0; i < 6; i++) {
        whitePegs += Math.min(secretCounts[i], guessCounts[i]);
      }

      // Prepare circuit inputs
      setStep(t("steps.preparingInputs"));
      setProgress(20);

      const circuitInput = {
        secretCode: secretCode.map(c => c.toString()),
        salt: codeSalt.toString(),
        guess: currentGuess.map(c => c.toString()),
        blackPegs: blackPegs.toString(),
        whitePegs: whitePegs.toString(),
        codeCommitment: codeCommitment.toString(),
      };

      // Generate proof
      setStep(t("steps.generatingProof"));
      setProgress(30);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        MASTERMIND_WASM_PATH,
        MASTERMIND_ZKEY_PATH,
        (p, msg) => {
          setProgress(30 + (p * 0.3));
          setStep(msg);
        }
      );

      // Verify proof locally
      setStep(t("steps.verifyingProof"));
      setProgress(65);

      const isValid = await verifyProof(MASTERMIND_VKEY_PATH, publicSignals, proof);

      if (!isValid) {
        throw new Error("Proof verification failed");
      }

      // Format proof for contract
      setStep(t("steps.formattingProof"));
      setProgress(70);

      const calldata = await exportSolidityCalldata(proof, publicSignals);
      const parsed = parseCalldata(calldata);

      const proofResult: ProofData = {
        pA: parsed.pA,
        pB: parsed.pB,
        pC: parsed.pC,
        pubSignals: parsed.pubSignals,
      };

      setLatestProof(proofResult);

      // Submit to contract
      setStep(t("steps.submittingOnChain"));
      setProgress(75);

      const guessValues = currentGuess.map(c => BigInt(c)) as [bigint, bigint, bigint, bigint];

      const hash = await walletClient.writeContract({
        address: gameContract,
        abi: MASTERMIND_GAME_ABI,
        functionName: "submitGuessWithHint",
        args: [
          guessValues,
          BigInt(blackPegs),
          BigInt(whitePegs),
          parsed.pA.map(BigInt) as [bigint, bigint],
          parsed.pB.map(row => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
          parsed.pC.map(BigInt) as [bigint, bigint],
        ],
      });

      setStep(t("steps.waitingConfirmation"));
      setProgress(90);

      await publicClient.waitForTransactionReceipt({ hash });

      setStep(t("steps.verified"));
      setProgress(100);

      const newGuess: Guess = {
        colors: [...currentGuess],
        blackPegs,
        whitePegs,
        verified: true,
        txHash: hash,
      };

      setGuesses([...guesses, newGuess]);

      if (blackPegs === 4) {
        setGameWon(true);
        setGameActive(false);
      }
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset game
  const resetGame = async () => {
    if (!walletClient || !publicClient || !gameContract) return;

    try {
      const hash = await walletClient.writeContract({
        address: gameContract,
        abi: MASTERMIND_GAME_ABI,
        functionName: "endGame",
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setCodeCommitment(null);
      setCodeSalt(null);
      setGuesses([]);
      setGameWon(false);
      setGameActive(false);
      setCurrentGuess([0, 0, 0, 0]);
      setLatestProof(null);
      setError(null);
    } catch (err) {
      console.error("Failed to reset game:", err);
    }
  };

  const cycleColor = (index: number, array: number[], setter: (arr: number[]) => void) => {
    const newArray = [...array];
    newArray[index] = (newArray[index] + 1) % 6;
    setter(newArray);
  };

  const getColorClass = (colorIndex: number) => {
    const classes = [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-green-500",
      "bg-blue-500",
      "bg-purple-500",
    ];
    return classes[colorIndex];
  };

  const currentStep = !gameAddress
    ? 0
    : !codeCommitment
    ? 1
    : !gameActive
    ? 2
    : guesses.length === 0
    ? 3
    : gameWon
    ? 5
    : 4;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") },
    { step: 1, name: t("progress.commitCode") },
    { step: 2, name: t("progress.startGame") },
    { step: 3, name: t("progress.makeGuess") },
    { step: 4, name: t("progress.verifyHints") },
    { step: 5, name: t("progress.complete") },
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

          <Tabs defaultValue="game" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="game">{t("tabs.demo")}</TabsTrigger>
              <TabsTrigger value="how">{t("tabs.howItWorks")}</TabsTrigger>
            </TabsList>

            <TabsContent value="game" className="space-y-4">
              {/* Contract Deployment */}
              <GenericContractDeployer
                config={mastermindConfig}
                onDeployed={handleDeployed}
                isDeployed={!!gameAddress}
                verifierAddress={verifierAddress}
                appAddress={gameAddress}
              />

              {/* Admin Controls */}
              {gameAddress && isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{t("adminControls.title")}</span>
                      <Badge variant="outline">{t("adminControls.codeSetter")}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t("adminControls.gameStatus")}</div>
                        <div className="text-sm text-muted-foreground">
                          {gameActive ? t("adminControls.gameActive") : t("adminControls.gameNotActive")}
                        </div>
                      </div>
                      <Badge variant={gameActive ? "default" : "secondary"}>
                        {gameActive ? t("adminControls.active") : t("adminControls.inactive")}
                      </Badge>
                    </div>

                    {gameActive && (
                      <Button onClick={resetGame} variant="destructive" className="w-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t("adminControls.resetGame")}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Game Panels */}
              {gameAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Code Setter */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="h-5 w-5" />
                          {t("codeSetter.title")}
                        </div>
                        {codeCommitment && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSecret(!showSecret)}
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && !isVerifying && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {/* Secret Code Selection */}
                      <div>
                        <label className="text-sm text-muted-foreground block mb-2">
                          {t("codeSetter.secretCode")}
                        </label>
                        <div className="flex gap-2 justify-center">
                          {secretCode.map((color, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              className={`w-12 h-12 ${showSecret || !codeCommitment ? getColorClass(color) : "bg-muted"} text-white font-bold`}
                              onClick={() => !codeCommitment && cycleColor(i, secretCode, setSecretCode)}
                              disabled={!!codeCommitment}
                            >
                              {showSecret || !codeCommitment ? COLOR_EMOJIS[color] : "?"}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {!codeCommitment ? (
                        <AnimatePresence mode="wait">
                          {isCommitting ? (
                            <motion.div
                              key="committing"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="space-y-2"
                            >
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{step}</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </motion.div>
                          ) : (
                            <Button onClick={commitCode} className="w-full" disabled={!isConnected}>
                              <Shield className="h-4 w-4 mr-2" />
                              {t("codeSetter.commitButton")}
                            </Button>
                          )}
                        </AnimatePresence>
                      ) : (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">{t("codeSetter.committed")}</span>
                          </div>
                          <code className="text-xs break-all block">
                            0x{codeCommitment.toString(16).slice(0, 20)}...
                          </code>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Guesser */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t("guesser.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {gameWon ? (
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <h4 className="font-bold text-green-600">{t("guesser.won")}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t("guesser.wonDesc", { attempts: guesses.length })}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Current Guess */}
                          <div>
                            <label className="text-sm text-muted-foreground block mb-2">
                              {t("guesser.yourGuess")}
                            </label>
                            <div className="flex gap-2 justify-center">
                              {currentGuess.map((color, i) => (
                                <Button
                                  key={i}
                                  variant="outline"
                                  className={`w-12 h-12 ${getColorClass(color)} text-white font-bold`}
                                  onClick={() => cycleColor(i, currentGuess, setCurrentGuess)}
                                  disabled={!gameActive}
                                >
                                  {COLOR_EMOJIS[color]}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <AnimatePresence mode="wait">
                            {isVerifying ? (
                              <motion.div
                                key="verifying"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="flex-1">{step}</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{t("steps.generatingProof")}</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(elapsedTime)}
                                  </span>
                                </div>
                              </motion.div>
                            ) : (
                              <Button onClick={submitGuess} disabled={!gameActive || !isConnected} className="w-full">
                                <Play className="h-4 w-4 mr-2" />
                                {t("guesser.submitGuess")}
                              </Button>
                            )}
                          </AnimatePresence>

                          {/* Latest Proof */}
                          {latestProof && (
                            <div className="space-y-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowProofDetails(!showProofDetails)}
                              >
                                {showProofDetails ? (
                                  <><ChevronUp className="h-4 w-4 mr-2" />{t("guesser.hideProof")}</>
                                ) : (
                                  <><ChevronDown className="h-4 w-4 mr-2" />{t("guesser.showProof")}</>
                                )}
                              </Button>

                              <AnimatePresence>
                                {showProofDetails && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-3 bg-background border rounded-lg">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileCode className="h-4 w-4" />
                                        <span className="text-sm font-medium">{t("guesser.proofData")}</span>
                                      </div>
                                      <pre className="text-xs overflow-x-auto font-mono max-h-32 overflow-y-auto">
                                        {JSON.stringify(
                                          { pA: latestProof.pA, pB: latestProof.pB, pC: latestProof.pC },
                                          null,
                                          2
                                        )}
                                      </pre>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Previous Guesses */}
                          {guesses.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">{t("guesser.previousGuesses")}</h4>
                              {guesses.map((guess, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 bg-muted rounded">
                                  <span className="text-sm text-muted-foreground">#{i + 1}</span>
                                  <div className="flex gap-1">
                                    {guess.colors.map((c, j) => (
                                      <span key={j} className={`w-6 h-6 rounded ${getColorClass(c)} flex items-center justify-center text-white text-xs font-bold`}>
                                        {COLOR_EMOJIS[c]}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex gap-1 ml-auto items-center">
                                    {Array(guess.blackPegs).fill(0).map((_, j) => (
                                      <span key={j} className="w-3 h-3 bg-foreground rounded-full" />
                                    ))}
                                    {Array(guess.whitePegs).fill(0).map((_, j) => (
                                      <span key={j} className="w-3 h-3 border-2 border-foreground rounded-full" />
                                    ))}
                                    {guess.verified && (
                                      <CheckCircle className="h-3 w-3 text-green-500 ml-1" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="how" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("howItWorks.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">{t("howItWorks.zkGuarantees")}</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>- {t("howItWorks.items.commitment")}</li>
                        <li>- {t("howItWorks.items.hints")}</li>
                        <li>- {t("howItWorks.items.noCheat")}</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">{t("howItWorks.legend")}</h4>
                      <div className="text-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-foreground rounded-full" />
                          <span>{t("howItWorks.blackPeg")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 border-2 border-foreground rounded-full" />
                          <span>{t("howItWorks.whitePeg")}</span>
                        </div>
                      </div>
                    </div>
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
                      {currentStep > item.step ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        item.step
                      )}
                    </div>
                    <span
                      className={
                        currentStep >= item.step ? "font-medium" : "text-muted-foreground"
                      }
                    >
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
                <span>{t("stats.title")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshContractState}
                  disabled={!gameAddress || isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stats.guesses")}</span>
                <Badge variant="secondary">{guesses.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stats.verified")}</span>
                <Badge variant="secondary">{guesses.filter(g => g.verified).length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stats.gameStatus")}</span>
                <Badge variant={gameWon ? "default" : gameActive ? "outline" : "secondary"}>
                  {gameWon ? t("stats.won") : gameActive ? t("stats.inProgress") : t("stats.notStarted")}
                </Badge>
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
                <Badge variant="outline" className="ml-2">
                  Base Sepolia
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.verifier")}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {verifierAddress || t("contractInfo.notDeployed")}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.gameContract")}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {gameAddress || t("contractInfo.notDeployed")}
                </div>
              </div>
              {gameAddress && (
                <a
                  href={`https://sepolia.basescan.org/address/${gameAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("contractInfo.viewOnBasescan")}
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
