"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Shield,
  CheckCircle,
  Loader2,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { poseidonHash, generateIdentitySecret } from "@/lib/zk/poseidon";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import { MASTERMIND_WASM_PATH, MASTERMIND_ZKEY_PATH, MASTERMIND_VKEY_PATH } from "@/lib/web3/contracts";
import { useTranslations } from "next-intl";

const COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];
const COLOR_EMOJIS = ["R", "O", "Y", "G", "B", "P"];

interface Guess {
  colors: number[];
  blackPegs: number;
  whitePegs: number;
  verified: boolean;
}

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
}

export function MastermindDemo() {
  const t = useTranslations("demo.mastermind");
  const common = useTranslations("common");

  const [secretCode, setSecretCode] = useState<number[]>([0, 1, 2, 3]);
  const [codeSalt, setCodeSalt] = useState<bigint | null>(null);
  const [codeCommitment, setCodeCommitment] = useState<bigint | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [currentGuess, setCurrentGuess] = useState<number[]>([0, 0, 0, 0]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [gameWon, setGameWon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [latestProof, setLatestProof] = useState<ProofData | null>(null);
  const [showProofDetails, setShowProofDetails] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const commitCode = async () => {
    setIsCommitting(true);
    setProgress(0);
    setError(null);

    try {
      setStep(t("steps.generatingSalt"));
      setProgress(30);

      const salt = generateIdentitySecret();
      setCodeSalt(salt);

      setStep(t("steps.computingCommitment"));
      setProgress(60);

      const commitment = await poseidonHash([
        BigInt(secretCode[0]),
        BigInt(secretCode[1]),
        BigInt(secretCode[2]),
        BigInt(secretCode[3]),
        salt,
      ]);

      setStep(t("steps.complete"));
      setProgress(100);

      setCodeCommitment(commitment);
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

  const submitGuess = async () => {
    if (!codeCommitment || !codeSalt) return;

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
        // Private inputs
        secretCode: secretCode.map(c => c.toString()),
        salt: codeSalt.toString(),
        // Public inputs
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
          setProgress(30 + (p * 0.4));
          setStep(msg);
        }
      );

      // Verify proof
      setStep(t("steps.verifyingProof"));
      setProgress(75);

      const isValid = await verifyProof(MASTERMIND_VKEY_PATH, publicSignals, proof);

      // Format proof for display
      setStep(t("steps.formattingProof"));
      setProgress(90);

      const calldata = await exportSolidityCalldata(proof, publicSignals);
      const parsed = parseCalldata(calldata);

      const proofResult: ProofData = {
        pA: parsed.pA,
        pB: parsed.pB,
        pC: parsed.pC,
        pubSignals: parsed.pubSignals,
      };

      setLatestProof(proofResult);

      setStep(t("steps.verified"));
      setProgress(100);

      const newGuess: Guess = {
        colors: [...currentGuess],
        blackPegs,
        whitePegs,
        verified: isValid,
      };

      setGuesses([...guesses, newGuess]);

      if (blackPegs === 4) {
        setGameWon(true);
      }
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsVerifying(false);
    }
  };

  const resetGame = () => {
    setCodeCommitment(null);
    setCodeSalt(null);
    setGuesses([]);
    setGameWon(false);
    setCurrentGuess([0, 0, 0, 0]);
    setLatestProof(null);
    setError(null);
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

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("intro.title")}</AlertTitle>
        <AlertDescription>{t("intro.description")}</AlertDescription>
      </Alert>

      <Tabs defaultValue="demo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="demo">{t("tabs.demo")}</TabsTrigger>
          <TabsTrigger value="how">{t("tabs.howItWorks")}</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {error && (
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
                      <Button onClick={commitCode} className="w-full">
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
                    <p className="text-sm text-muted-foreground">{t("guesser.wonDesc", { attempts: guesses.length })}</p>
                    <Button onClick={resetGame} className="mt-4">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t("guesser.playAgain")}
                    </Button>
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
                            disabled={!codeCommitment}
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
                        <Button onClick={submitGuess} disabled={!codeCommitment} className="w-full">
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
        </TabsContent>

        <TabsContent value="how">
          <Card>
            <CardHeader>
              <CardTitle>{t("howItWorks.title")}</CardTitle>
            </CardHeader>
            <CardContent>
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
  );
}
