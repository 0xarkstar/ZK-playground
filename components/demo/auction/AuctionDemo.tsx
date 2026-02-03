"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel,
  Shield,
  CheckCircle,
  Loader2,
  Info,
  Lock,
  Eye,
  EyeOff,
  Trophy,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { poseidonHashTwo, generateIdentitySecret } from "@/lib/zk/poseidon";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import { AUCTION_WASM_PATH, AUCTION_ZKEY_PATH, AUCTION_VKEY_PATH } from "@/lib/web3/contracts";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";

interface Bid {
  address: string;
  commitment: string;
  revealed: boolean;
  amount?: number;
}

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
  commitment: string;
}

export function AuctionDemo() {
  const t = useTranslations("demo.auction");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();

  const [phase, setPhase] = useState<"bidding" | "reveal" | "finalized">("bidding");
  const [myBid, setMyBid] = useState("");
  const [mySalt, setMySalt] = useState<bigint | null>(null);
  const [myCommitment, setMyCommitment] = useState<string | null>(null);
  const [bids, setBids] = useState<Bid[]>([
    { address: "0xAlice...1234", commitment: "0x1a2b...3c4d", revealed: false },
    { address: "0xBob...5678", commitment: "0x5e6f...7g8h", revealed: false },
  ]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [showBid, setShowBid] = useState(false);
  const [winner, setWinner] = useState<Bid | null>(null);

  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showProofDetails, setShowProofDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auction parameters (in wei equivalent for demo)
  const MIN_BID = 100;
  const MAX_BID = 10000;

  // Timer for proof generation
  useEffect(() => {
    if (isRevealing) {
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
  }, [isRevealing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const commitBid = async () => {
    if (!myBid || parseFloat(myBid) <= 0) return;

    setIsCommitting(true);
    setProgress(0);
    setError(null);

    try {
      setStep(t("steps.generatingSalt"));
      setProgress(30);

      const salt = generateIdentitySecret();
      setMySalt(salt);

      setStep(t("steps.computingCommitment"));
      setProgress(60);

      // Convert ETH to wei-like value for demo (multiply by 100 to avoid decimals)
      const bidAmountInt = BigInt(Math.floor(parseFloat(myBid) * 100));
      const commitment = await poseidonHashTwo(bidAmountInt, salt);

      setStep(t("steps.submittingCommitment"));
      setProgress(90);

      const commitmentHex = "0x" + commitment.toString(16).padStart(64, "0");
      setMyCommitment(commitmentHex);

      setBids([...bids, {
        address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "0xYou...9999",
        commitment: commitmentHex.slice(0, 12) + "...",
        revealed: false,
      }]);

      setStep(t("steps.complete"));
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setIsCommitting(false);
    }
  };

  const revealBid = async () => {
    if (!myCommitment || !mySalt || !address) return;

    setIsRevealing(true);
    setProgress(0);
    setError(null);
    setProofData(null);
    setIsVerified(false);

    try {
      const bidAmountInt = BigInt(Math.floor(parseFloat(myBid) * 100));

      // Step 1: Prepare circuit inputs
      setStep(t("steps.preparingInputs"));
      setProgress(10);

      // Recompute commitment to ensure consistency
      const commitment = await poseidonHashTwo(bidAmountInt, mySalt);

      const circuitInput = {
        // Private inputs
        bidAmount: bidAmountInt.toString(),
        salt: mySalt.toString(),
        // Public inputs
        commitment: commitment.toString(),
        minBid: MIN_BID.toString(),
        maxBid: MAX_BID.toString(),
        bidderAddress: BigInt(address).toString(),
      };

      // Step 2: Generate proof using snarkjs
      setStep(t("steps.generatingProof"));
      setProgress(30);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        AUCTION_WASM_PATH,
        AUCTION_ZKEY_PATH,
        (p, msg) => {
          setProgress(30 + (p * 0.4));
          setStep(msg);
        }
      );

      // Step 3: Verify proof locally
      setStep(t("steps.verifyingProof"));
      setProgress(75);

      const isValid = await verifyProof(AUCTION_VKEY_PATH, publicSignals, proof);

      // Step 4: Format proof for Solidity
      setStep(t("steps.formattingProof"));
      setProgress(85);

      const calldata = await exportSolidityCalldata(proof, publicSignals);
      const parsed = parseCalldata(calldata);

      const proofResult: ProofData = {
        pA: parsed.pA,
        pB: parsed.pB,
        pC: parsed.pC,
        pubSignals: parsed.pubSignals,
        commitment: commitment.toString(),
      };

      setStep(t("steps.revealingBid"));
      setProgress(95);

      // Update bids with revealed amount
      setBids(bids.map((b) =>
        b.address.includes(address.slice(0, 6)) || b.address === "0xYou...9999"
          ? { ...b, revealed: true, amount: parseFloat(myBid) }
          : b
      ));

      setStep(t("steps.complete"));
      setProgress(100);

      setProofData(proofResult);
      setIsVerified(isValid);
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsRevealing(false);
    }
  };

  const advancePhase = () => {
    if (phase === "bidding") {
      setPhase("reveal");
    } else if (phase === "reveal") {
      // Simulate other bidders revealing
      const revealedBids = bids.map((b) => {
        if (b.address.includes(address?.slice(0, 6) || "") || b.address === "0xYou...9999") return b;
        return { ...b, revealed: true, amount: Math.floor(Math.random() * 1000) + 100 };
      });
      setBids(revealedBids);

      // Determine winner
      const allRevealed = revealedBids.filter((b) => b.revealed);
      const highestBid = allRevealed.reduce((max, b) => (b.amount || 0) > (max.amount || 0) ? b : max, allRevealed[0]);
      setWinner(highestBid);
      setPhase("finalized");
    }
  };

  const isUserBid = (bid: Bid) => {
    return bid.address.includes(address?.slice(0, 6) || "") || bid.address === "0xYou...9999";
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("intro.title")}</AlertTitle>
        <AlertDescription>{t("intro.description")}</AlertDescription>
      </Alert>

      {/* Phase Indicator */}
      <div className="flex justify-center gap-4">
        {["bidding", "reveal", "finalized"].map((p, i) => (
          <div key={p} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              phase === p ? "bg-primary text-primary-foreground" :
              ["bidding", "reveal", "finalized"].indexOf(phase) > i ? "bg-green-500 text-white" : "bg-muted"
            }`}>
              {i + 1}
            </div>
            <span className={`ml-2 text-sm ${phase === p ? "font-medium" : "text-muted-foreground"}`}>
              {t(`phases.${p}`)}
            </span>
            {i < 2 && <div className="w-8 h-0.5 mx-2 bg-muted" />}
          </div>
        ))}
      </div>

      <Tabs defaultValue="demo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="demo">{t("tabs.demo")}</TabsTrigger>
          <TabsTrigger value="how">{t("tabs.howItWorks")}</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Your Bid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Gavel className="h-5 w-5" />{t("yourBid.title")}</div>
                  {myCommitment && (
                    <Button variant="ghost" size="sm" onClick={() => setShowBid(!showBid)}>
                      {showBid ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

                {phase === "bidding" && !myCommitment && (
                  <>
                    <div>
                      <label className="text-sm text-muted-foreground">{t("yourBid.amount")}</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={myBid}
                          onChange={(e) => setMyBid(e.target.value)}
                        />
                        <span className="flex items-center text-muted-foreground">ETH</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Min: {MIN_BID / 100} ETH, Max: {MAX_BID / 100} ETH
                      </p>
                    </div>

                    <AnimatePresence mode="wait">
                      {isCommitting ? (
                        <motion.div key="committing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /><span>{step}</span></div>
                          <Progress value={progress} className="h-2" />
                        </motion.div>
                      ) : (
                        <Button onClick={commitBid} disabled={!myBid || !isConnected} className="w-full">
                          <Lock className="h-4 w-4 mr-2" />{t("yourBid.commitButton")}
                        </Button>
                      )}
                    </AnimatePresence>

                    {!isConnected && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t("yourBid.connectWallet")}
                      </p>
                    )}
                  </>
                )}

                {myCommitment && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-500 inline mr-2" />
                    <span className="text-sm font-medium">{t("yourBid.committed")}</span>
                    {showBid && <div className="mt-2 text-lg font-bold">{myBid} ETH</div>}
                  </div>
                )}

                {phase === "reveal" && myCommitment && !proofData && (
                  <AnimatePresence mode="wait">
                    {isRevealing ? (
                      <motion.div key="revealing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
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
                      <Button onClick={revealBid} disabled={bids.find((b) => isUserBid(b))?.revealed} className="w-full">
                        <Shield className="h-4 w-4 mr-2" />{t("yourBid.revealButton")}
                      </Button>
                    )}
                  </AnimatePresence>
                )}

                {/* Proof Details */}
                {proofData && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t("yourBid.proofVerified")}</span>
                    </div>

                    <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("yourBid.verified")}</span>
                        <Badge variant={isVerified ? "default" : "destructive"}>
                          {isVerified ? common("yes") : common("no")}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("yourBid.bidAmount")}</span>
                        <span className="font-mono">{myBid} ETH</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowProofDetails(!showProofDetails)}
                    >
                      {showProofDetails ? (
                        <><ChevronUp className="h-4 w-4 mr-2" />{t("yourBid.hideDetails")}</>
                      ) : (
                        <><ChevronDown className="h-4 w-4 mr-2" />{t("yourBid.showDetails")}</>
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
                              <span className="text-sm font-medium">{t("yourBid.proofData")}</span>
                            </div>
                            <pre className="text-xs overflow-x-auto font-mono max-h-40 overflow-y-auto">
                              {JSON.stringify(
                                {
                                  pA: proofData.pA,
                                  pB: proofData.pB,
                                  pC: proofData.pC,
                                },
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

                {phase === "finalized" && winner && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 rounded-lg ${isUserBid(winner) ? "bg-green-500/10 border border-green-500/20" : "bg-muted"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className={`h-5 w-5 ${isUserBid(winner) ? "text-yellow-500" : "text-muted-foreground"}`} />
                      <span className="font-medium">
                        {isUserBid(winner) ? t("yourBid.youWon") : t("yourBid.youLost")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("yourBid.winningBid")}: {winner.amount} ETH
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* All Bids */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t("allBids.title")}</span>
                  {phase !== "finalized" && (
                    <Button size="sm" onClick={advancePhase}>{t("allBids.nextPhase")}</Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bids.map((bid, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-mono text-sm">{bid.address}</div>
                        <div className="text-xs text-muted-foreground">{bid.commitment}</div>
                      </div>
                      <div>
                        {bid.revealed ? (
                          <Badge variant="default">{bid.amount} ETH</Badge>
                        ) : (
                          <Badge variant="secondary">{t("allBids.hidden")}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="how">
          <Card>
            <CardHeader><CardTitle>{t("howItWorks.title")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Lock className="h-5 w-5 text-primary mb-2" />
                  <h4 className="font-medium">{t("howItWorks.step1.title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("howItWorks.step1.description")}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <Shield className="h-5 w-5 text-primary mb-2" />
                  <h4 className="font-medium">{t("howItWorks.step2.title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("howItWorks.step2.description")}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <Trophy className="h-5 w-5 text-primary mb-2" />
                  <h4 className="font-medium">{t("howItWorks.step3.title")}</h4>
                  <p className="text-sm text-muted-foreground">{t("howItWorks.step3.description")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
