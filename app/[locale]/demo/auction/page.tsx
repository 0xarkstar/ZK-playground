"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GenericContractDeployer, DemoContractConfig } from "@/components/demo/GenericContractDeployer";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletBalance, FaucetLink } from "@/components/demo/WalletBalance";
import { poseidonHashTwo, generateIdentitySecret } from "@/lib/zk/poseidon";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import {
  SEALED_BID_AUCTION_ABI,
  AUCTION_VERIFIER_BYTECODE,
  SEALED_BID_AUCTION_BYTECODE,
  AUCTION_WASM_PATH,
  AUCTION_ZKEY_PATH,
  AUCTION_VKEY_PATH,
  VERIFIER_ABI,
} from "@/lib/web3/contracts";
import {
  Wallet,
  CheckCircle2,
  Info,
  ExternalLink,
  Gavel,
  Shield,
  Loader2,
  RefreshCw,
  Clock,
  Lock,
  Send,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LiveBadge } from "@/components/demo/LiveBadge";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther, parseEther } from "viem";

interface BidData {
  bidAmount: bigint;
  salt: bigint;
  commitment: bigint;
}

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
}

const CONTRACT_CONFIG: DemoContractConfig = {
  name: "Sealed Bid Auction",
  verifierAbi: VERIFIER_ABI,
  verifierBytecode: AUCTION_VERIFIER_BYTECODE,
  appAbi: SEALED_BID_AUCTION_ABI,
  appBytecode: SEALED_BID_AUCTION_BYTECODE,
  verifierLabel: "Auction Verifier",
  appLabel: "SealedBidAuction",
};

export default function AuctionDemoPage() {
  const t = useTranslations("demo.auction");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [auctionAddress, setAuctionAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Auction state
  const [auctionId, setAuctionId] = useState<number | null>(null);
  const [auctionPhase, setAuctionPhase] = useState<number>(0); // 0: Bidding, 1: Reveal, 2: Finalized
  const [minBid, setMinBid] = useState<bigint>(parseEther("0.001"));
  const [maxBid, setMaxBid] = useState<bigint>(parseEther("0.1"));

  // User state
  const [bidData, setBidData] = useState<BidData | null>(null);
  const [bidAmountInput, setBidAmountInput] = useState("0.01");
  const [proof, setProof] = useState<ProofData | null>(null);
  const [hasBid, setHasBid] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // UI state
  const [isCreatingAuction, setIsCreatingAuction] = useState(false);
  const [isCommittingBid, setIsCommittingBid] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Winner info
  const [winner, setWinner] = useState<string | null>(null);
  const [winningBid, setWinningBid] = useState<bigint>(BigInt(0));
  const [bidderCount, setBidderCount] = useState(0);

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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isGeneratingProof]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const auctionContract = auctionAddress as `0x${string}` | null;

  // Refresh contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !auctionContract || auctionId === null) return;

    setIsRefreshing(true);
    try {
      const [auctionData, bidders] = await Promise.all([
        publicClient.readContract({
          address: auctionContract,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: "getAuction",
          args: [BigInt(auctionId)],
        }),
        publicClient.readContract({
          address: auctionContract,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: "getBidderCount",
          args: [BigInt(auctionId)],
        }),
      ]);

      const [seller, min, max, phase, winnerAddr, winning] = auctionData as [string, bigint, bigint, number, string, bigint];
      setMinBid(min);
      setMaxBid(max);
      setAuctionPhase(phase);
      setWinner(winnerAddr);
      setWinningBid(winning);
      setBidderCount(Number(bidders));
      setIsOwner(address?.toLowerCase() === seller.toLowerCase());
    } catch (err) {
      console.error("Failed to refresh auction state:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, auctionContract, auctionId, address]);

  useEffect(() => {
    if (auctionContract && auctionId !== null) refreshContractState();
  }, [auctionContract, auctionId, refreshContractState]);

  // Handle contract deployment
  const handleDeployed = (verifier: string, auction: string) => {
    setVerifierAddress(verifier);
    setAuctionAddress(auction);
    setIsOwner(true);
  };

  // Create auction (admin only)
  const createAuction = async () => {
    if (!walletClient || !publicClient || !auctionContract) return;

    setIsCreatingAuction(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: auctionContract,
        abi: SEALED_BID_AUCTION_ABI,
        functionName: "createAuction",
        args: [
          parseEther("0.001"), // minBid
          parseEther("0.1"),   // maxBid
          parseEther("0.005"), // depositRequired
          BigInt(300),         // biddingDuration (5 mins)
          BigInt(300),         // revealDuration (5 mins)
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Get auction ID from event
      const auctionCreatedEvent = receipt.logs.find(log =>
        log.topics[0] === "0x3e5e5c3a7e3e5c3a7e3e5c3a7e3e5c3a7e3e5c3a7e3e5c3a7e3e5c3a7e3e5c3a"
      );

      // For simplicity, use counter - 1
      const counter = await publicClient.readContract({
        address: auctionContract,
        abi: SEALED_BID_AUCTION_ABI,
        functionName: "auctionCounter",
      });

      setAuctionId(Number(counter) - 1);
      refreshContractState();
    } catch (err) {
      console.error("Failed to create auction:", err);
      setError(err instanceof Error ? err.message : "Failed to create auction");
    } finally {
      setIsCreatingAuction(false);
    }
  };

  // Commit bid
  const commitBid = async () => {
    if (!walletClient || !publicClient || !auctionContract || auctionId === null) return;

    setIsCommittingBid(true);
    setError(null);

    try {
      const bidAmount = parseEther(bidAmountInput);
      const salt = generateIdentitySecret();
      const commitment = await poseidonHashTwo(bidAmount, salt);

      const hash = await walletClient.writeContract({
        address: auctionContract,
        abi: SEALED_BID_AUCTION_ABI,
        functionName: "commitBid",
        args: [BigInt(auctionId), commitment],
        value: parseEther("0.005"), // deposit
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setBidData({
        bidAmount,
        salt,
        commitment,
      });
      setHasBid(true);
      refreshContractState();
    } catch (err) {
      console.error("Failed to commit bid:", err);
      setError(err instanceof Error ? err.message : "Failed to commit bid");
    } finally {
      setIsCommittingBid(false);
    }
  };

  // Generate reveal proof
  const generateRevealProof = async () => {
    if (!bidData || !address) return;

    setIsGeneratingProof(true);
    setProgress(0);
    setError(null);
    setProof(null);

    try {
      setStep(t("steps.preparingInputs") || "Preparing inputs...");
      setProgress(20);

      const circuitInput = {
        bidAmount: bidData.bidAmount.toString(),
        salt: bidData.salt.toString(),
        commitment: bidData.commitment.toString(),
        minBid: minBid.toString(),
        maxBid: maxBid.toString(),
        bidderAddress: BigInt(address).toString(),
      };

      setStep(t("steps.generatingProof") || "Generating proof...");
      setProgress(40);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        AUCTION_WASM_PATH,
        AUCTION_ZKEY_PATH,
        (p, msg) => {
          setProgress(40 + p * 0.4);
          setStep(msg);
        }
      );

      setStep(t("steps.verifyingProof") || "Verifying proof...");
      setProgress(85);

      const isValid = await verifyProof(AUCTION_VKEY_PATH, publicSignals, proof);
      if (!isValid) throw new Error("Proof verification failed");

      setStep(t("steps.formattingProof") || "Formatting proof...");
      setProgress(95);

      const calldata = await exportSolidityCalldata(proof, publicSignals);
      const parsed = parseCalldata(calldata);

      setStep(t("steps.complete") || "Complete!");
      setProgress(100);

      setProof({
        pA: parsed.pA,
        pB: parsed.pB,
        pC: parsed.pC,
        pubSignals: parsed.pubSignals,
      });
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Reveal bid on-chain
  const revealBid = async () => {
    if (!walletClient || !publicClient || !auctionContract || !proof || !bidData || auctionId === null) return;

    setIsRevealing(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: auctionContract,
        abi: SEALED_BID_AUCTION_ABI,
        functionName: "revealBid",
        args: [
          BigInt(auctionId),
          proof.pA.map(BigInt) as [bigint, bigint],
          proof.pB.map((row) => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
          proof.pC.map(BigInt) as [bigint, bigint],
          bidData.bidAmount,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setHasRevealed(true);
      refreshContractState();
    } catch (err) {
      console.error("Reveal error:", err);
      setError(err instanceof Error ? err.message : "Reveal failed");
    } finally {
      setIsRevealing(false);
    }
  };

  const phaseNames = ["Bidding", "Reveal", "Finalized"];
  const currentStep = !auctionAddress ? 0 : auctionId === null ? 1 : !hasBid ? 2 : !proof ? 3 : !hasRevealed ? 4 : 5;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") || "Deploy Contracts" },
    { step: 1, name: t("progress.createAuction") || "Create Auction" },
    { step: 2, name: t("progress.commitBid") || "Commit Bid" },
    { step: 3, name: t("progress.generateProof") || "Generate Proof" },
    { step: 4, name: t("progress.revealBid") || "Reveal Bid" },
    { step: 5, name: t("progress.complete") || "Complete" },
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
            <AlertTitle>{t("realBlockchainAlert.title") || "Real Blockchain"}</AlertTitle>
            <AlertDescription>
              {t("realBlockchainAlert.description") || "This demo uses real smart contracts on Base Sepolia testnet."}{" "}
              <FaucetLink />.
            </AlertDescription>
          </Alert>

          {/* Wallet Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t("walletConnection") || "Wallet Connection"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConnectButton chainStatus="icon" showBalance={false} />
              {isConnected && <WalletBalance />}
            </CardContent>
          </Card>

          <Tabs defaultValue="auction" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auction">{t("tabs.demo") || "Demo"}</TabsTrigger>
              <TabsTrigger value="how">{t("tabs.howItWorks") || "How It Works"}</TabsTrigger>
            </TabsList>

            <TabsContent value="auction" className="space-y-4">
              {/* Contract Deployment */}
              <GenericContractDeployer
                config={CONTRACT_CONFIG}
                onDeployed={handleDeployed}
                isDeployed={!!auctionAddress}
                verifierAddress={verifierAddress}
                appAddress={auctionAddress}
              />

              {/* Create Auction */}
              {auctionAddress && auctionId === null && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gavel className="h-5 w-5" />
                      {t("createAuction.title") || "Create Auction"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("createAuction.description") || "Create a new sealed-bid auction with ZK verification."}
                    </p>
                    <Button onClick={createAuction} disabled={isCreatingAuction} className="w-full">
                      {isCreatingAuction ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gavel className="h-4 w-4 mr-2" />}
                      {t("createAuction.button") || "Create Auction"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Bid & Reveal */}
              {auctionId !== null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Commit Bid */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        {t("bid.title") || "Submit Sealed Bid"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {hasBid ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">{t("bid.committed") || "Bid Committed"}</span>
                          </div>
                          <div className="p-3 bg-muted rounded-lg text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{t("bid.yourBid") || "Your Bid"}</span>
                              <span className="font-bold">{formatEther(bidData?.bidAmount || BigInt(0))} ETH</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>{t("bid.amount") || "Bid Amount (ETH)"}</Label>
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="0.1"
                              value={bidAmountInput}
                              onChange={(e) => setBidAmountInput(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Min: {formatEther(minBid)} ETH, Max: {formatEther(maxBid)} ETH
                            </p>
                          </div>
                          <Button onClick={commitBid} disabled={isCommittingBid || auctionPhase !== 0} className="w-full">
                            {isCommittingBid ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                            {t("bid.button") || "Commit Bid"}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Generate Proof & Reveal */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t("reveal.title") || "Reveal Bid"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {hasRevealed ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">{t("reveal.revealed") || "Bid Revealed"}</span>
                          </div>
                          {txHash && (
                            <a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="w-full">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                {t("reveal.viewTx") || "View Transaction"}
                              </Button>
                            </a>
                          )}
                        </div>
                      ) : proof ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">{t("reveal.proofReady") || "Proof Ready"}</span>
                          </div>
                          <Button onClick={revealBid} disabled={isRevealing || auctionPhase !== 1} className="w-full">
                            {isRevealing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            {t("reveal.button") || "Reveal Bid"}
                          </Button>
                        </div>
                      ) : (
                        <>
                          {error && (
                            <Alert variant="destructive">
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )}
                          <AnimatePresence mode="wait">
                            {isGeneratingProof ? (
                              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="flex-1">{step}</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{t("reveal.generating") || "Generating..."}</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(elapsedTime)}
                                  </span>
                                </div>
                              </motion.div>
                            ) : (
                              <Button onClick={generateRevealProof} disabled={!hasBid} className="w-full">
                                <Shield className="h-4 w-4 mr-2" />
                                {t("reveal.generateProof") || "Generate Proof"}
                              </Button>
                            )}
                          </AnimatePresence>
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
                  <CardTitle>{t("privacy.title") || "How It Works"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">{t("privacy.hidden.title") || "What's Hidden"}</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• {t("privacy.hidden.item1") || "Your actual bid amount during bidding phase"}</li>
                        <li>• {t("privacy.hidden.item2") || "Your bid salt (random secret)"}</li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold">{t("privacy.proven.title") || "What's Proven"}</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• {t("privacy.proven.item1") || "Your bid is within min/max range"}</li>
                        <li>• {t("privacy.proven.item2") || "Commitment matches bid + salt"}</li>
                      </ul>
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
              <CardTitle className="text-lg">{t("progress.title") || "Progress"}</CardTitle>
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
                <span>{t("auctionStatus.title") || "Auction Status"}</span>
                <Button variant="ghost" size="sm" onClick={refreshContractState} disabled={!auctionAddress || isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("auctionStatus.phase") || "Phase"}</span>
                <Badge variant={auctionPhase === 0 ? "default" : auctionPhase === 1 ? "secondary" : "outline"}>
                  {phaseNames[auctionPhase] || "N/A"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("auctionStatus.bidders") || "Bidders"}</span>
                <Badge variant="secondary">{bidderCount}</Badge>
              </div>
              {auctionPhase === 2 && winner && winner !== "0x0000000000000000000000000000000000000000" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("auctionStatus.winner") || "Winner"}</span>
                    <span className="font-mono text-xs">{winner.slice(0, 10)}...</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("auctionStatus.winningBid") || "Winning Bid"}</span>
                    <span className="font-bold">{formatEther(winningBid)} ETH</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("contractInfo.title") || "Contract Info"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("contractInfo.network") || "Network"}:</span>
                <Badge variant="outline" className="ml-2">Base Sepolia</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.verifier") || "Verifier"}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {verifierAddress || t("contractInfo.notDeployed") || "Not deployed"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.auctionContract") || "Auction Contract"}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {auctionAddress || t("contractInfo.notDeployed") || "Not deployed"}
                </div>
              </div>
              {auctionAddress && (
                <a href={`https://sepolia.basescan.org/address/${auctionAddress}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("contractInfo.viewOnBasescan") || "View on Basescan"}
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
