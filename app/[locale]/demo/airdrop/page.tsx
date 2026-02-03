"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { GenericContractDeployer, DemoContractConfig } from "@/components/demo/GenericContractDeployer";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletBalance, FaucetLink } from "@/components/demo/WalletBalance";
import { MerkleTree } from "@/lib/zk/merkle";
import { poseidonHashSingle, poseidonHashTwo, generateIdentitySecret } from "@/lib/zk/poseidon";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import {
  PRIVATE_AIRDROP_ABI,
  AIRDROP_VERIFIER_BYTECODE,
  PRIVATE_AIRDROP_BYTECODE,
  AIRDROP_WASM_PATH,
  AIRDROP_ZKEY_PATH,
  AIRDROP_VKEY_PATH,
  TREE_DEPTH,
  VERIFIER_ABI,
} from "@/lib/web3/contracts";
import {
  Wallet,
  CheckCircle2,
  Info,
  ExternalLink,
  Gift,
  Shield,
  Loader2,
  Users,
  RefreshCw,
  Play,
  Square,
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LiveBadge } from "@/components/demo/LiveBadge";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther, parseEther } from "viem";

interface UserIdentity {
  secret: bigint;
  commitment: bigint;
  leafIndex: number;
}

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
  nullifierHash: string;
}

const CONTRACT_CONFIG: DemoContractConfig = {
  name: "Private Airdrop",
  verifierAbi: VERIFIER_ABI,
  verifierBytecode: AIRDROP_VERIFIER_BYTECODE,
  appAbi: PRIVATE_AIRDROP_ABI,
  appBytecode: PRIVATE_AIRDROP_BYTECODE,
  verifierLabel: "Airdrop Verifier",
  appLabel: "PrivateAirdrop",
};

export default function AirdropDemoPage() {
  const t = useTranslations("demo.airdrop");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [airdropAddress, setAirdropAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Airdrop state
  const [airdropActive, setAirdropActive] = useState(false);
  const [merkleRoot, setMerkleRoot] = useState<bigint | null>(null);
  const [claimAmount, setClaimAmount] = useState<bigint>(BigInt(0));
  const [commitments, setCommitments] = useState<bigint[]>([]);

  // User state
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [proof, setProof] = useState<ProofData | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // UI state
  const [isRegistering, setIsRegistering] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats
  const [stats, setStats] = useState({ totalClaimed: BigInt(0), claimCount: 0, remaining: BigInt(0) });

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

  const airdropContract = airdropAddress as `0x${string}` | null;

  // Refresh contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !airdropContract) return;

    setIsRefreshing(true);
    try {
      const [active, root, amount, owner, statsData] = await Promise.all([
        publicClient.readContract({
          address: airdropContract,
          abi: PRIVATE_AIRDROP_ABI,
          functionName: "active",
        }),
        publicClient.readContract({
          address: airdropContract,
          abi: PRIVATE_AIRDROP_ABI,
          functionName: "merkleRoot",
        }),
        publicClient.readContract({
          address: airdropContract,
          abi: PRIVATE_AIRDROP_ABI,
          functionName: "claimAmount",
        }),
        publicClient.readContract({
          address: airdropContract,
          abi: PRIVATE_AIRDROP_ABI,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: airdropContract,
          abi: PRIVATE_AIRDROP_ABI,
          functionName: "getStats",
        }),
      ]);

      setAirdropActive(active as boolean);
      setMerkleRoot(BigInt(root as string));
      setClaimAmount(amount as bigint);
      setIsOwner(address?.toLowerCase() === (owner as string)?.toLowerCase());
      const [totalClaimed, claimCount, remaining] = statsData as [bigint, bigint, bigint];
      setStats({ totalClaimed, claimCount: Number(claimCount), remaining });
    } catch (err) {
      console.error("Failed to refresh contract state:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, airdropContract, address]);

  useEffect(() => {
    if (airdropContract) refreshContractState();
  }, [airdropContract, refreshContractState]);

  // Handle contract deployment
  const handleDeployed = (verifier: string, airdrop: string) => {
    setVerifierAddress(verifier);
    setAirdropAddress(airdrop);
    setIsOwner(true);
  };

  // Register eligible user (add to local commitments)
  const registerEligibility = async () => {
    if (!address) return;

    setIsRegistering(true);
    setError(null);

    try {
      const secret = generateIdentitySecret();
      const commitment = await poseidonHashSingle(secret);

      const newIdentity: UserIdentity = {
        secret,
        commitment,
        leafIndex: commitments.length,
      };

      setIdentity(newIdentity);
      setCommitments((prev) => [...prev, commitment]);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  // Initialize airdrop (admin only)
  const initializeAirdrop = async () => {
    if (!walletClient || !publicClient || !airdropContract || commitments.length === 0) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Build Merkle tree
      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();
      await tree.insertMany(commitments);
      const root = tree.getRoot();

      const rootBytes = ("0x" + root.toString(16).padStart(64, "0")) as `0x${string}`;
      const amountPerClaim = parseEther("0.001"); // 0.001 ETH per claim

      const hash = await walletClient.writeContract({
        address: airdropContract,
        abi: PRIVATE_AIRDROP_ABI,
        functionName: "initializeETHAirdrop",
        args: [rootBytes, amountPerClaim],
        value: parseEther("0.01"), // Fund with 0.01 ETH (enough for 10 claims)
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setMerkleRoot(root);
      setClaimAmount(amountPerClaim);
      setAirdropActive(true);
      refreshContractState();
    } catch (err) {
      console.error("Failed to initialize airdrop:", err);
      setError(err instanceof Error ? err.message : "Initialization failed");
    } finally {
      setIsInitializing(false);
    }
  };

  // End airdrop (admin only)
  const endAirdrop = async () => {
    if (!walletClient || !publicClient || !airdropContract) return;

    try {
      const hash = await walletClient.writeContract({
        address: airdropContract,
        abi: PRIVATE_AIRDROP_ABI,
        functionName: "endAirdrop",
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setAirdropActive(false);
      refreshContractState();
    } catch (err) {
      console.error("Failed to end airdrop:", err);
    }
  };

  // Generate claim proof
  const generateClaimProof = async () => {
    if (!identity || !merkleRoot || !address) return;

    setIsGeneratingProof(true);
    setProgress(0);
    setError(null);
    setProof(null);

    try {
      setStep(t("steps.buildingTree"));
      setProgress(10);

      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();
      await tree.insertMany(commitments);

      setStep(t("steps.generatingMerkle"));
      setProgress(20);

      const merkleProof = await tree.getProof(identity.leafIndex);

      setStep(t("steps.computingNullifier"));
      setProgress(30);

      const nullifierHash = await poseidonHashTwo(identity.secret, merkleRoot);

      setStep(t("steps.preparingInputs"));
      setProgress(40);

      const recipientAddress = BigInt(address);

      const circuitInput = {
        secret: identity.secret.toString(),
        pathElements: merkleProof.pathElements.map((e) => e.toString()),
        pathIndices: merkleProof.pathIndices.map((i) => i.toString()),
        merkleRoot: merkleRoot.toString(),
        nullifierHash: nullifierHash.toString(),
        recipient: recipientAddress.toString(),
        amount: claimAmount.toString(),
      };

      setStep(t("steps.generatingProof"));
      setProgress(50);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        AIRDROP_WASM_PATH,
        AIRDROP_ZKEY_PATH,
        (p, msg) => {
          setProgress(50 + p * 0.3);
          setStep(msg);
        }
      );

      setStep(t("steps.verifyingProof"));
      setProgress(85);

      const isValid = await verifyProof(AIRDROP_VKEY_PATH, publicSignals, proof);
      if (!isValid) throw new Error("Proof verification failed");

      setStep(t("steps.formattingProof"));
      setProgress(95);

      const calldata = await exportSolidityCalldata(proof, publicSignals);
      const parsed = parseCalldata(calldata);

      const proofResult: ProofData = {
        pA: parsed.pA,
        pB: parsed.pB,
        pC: parsed.pC,
        pubSignals: parsed.pubSignals,
        nullifierHash: nullifierHash.toString(),
      };

      setStep(t("steps.complete"));
      setProgress(100);

      setProof(proofResult);
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Submit claim on-chain
  const submitClaim = async () => {
    if (!walletClient || !publicClient || !airdropContract || !proof || !address) return;

    setIsClaiming(true);
    setError(null);

    try {
      const hash = await walletClient.writeContract({
        address: airdropContract,
        abi: PRIVATE_AIRDROP_ABI,
        functionName: "claim",
        args: [
          proof.pA.map(BigInt) as [bigint, bigint],
          proof.pB.map((row) => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
          proof.pC.map(BigInt) as [bigint, bigint],
          BigInt(proof.nullifierHash),
          address,
          claimAmount,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setHasClaimed(true);
      refreshContractState();
    } catch (err) {
      console.error("Claim error:", err);
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setIsClaiming(false);
    }
  };

  const currentStep = !airdropAddress
    ? 0
    : !identity
    ? 1
    : !airdropActive
    ? 2
    : !proof
    ? 3
    : !hasClaimed
    ? 4
    : 5;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") || "Deploy Contracts" },
    { step: 1, name: t("progress.registerEligibility") || "Register Eligibility" },
    { step: 2, name: t("progress.initializeAirdrop") || "Initialize Airdrop" },
    { step: 3, name: t("progress.generateProof") || "Generate Proof" },
    { step: 4, name: t("progress.claimAirdrop") || "Claim Airdrop" },
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

          <Tabs defaultValue="claim" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="claim">{t("tabs.demo")}</TabsTrigger>
              <TabsTrigger value="how">{t("tabs.howItWorks")}</TabsTrigger>
            </TabsList>

            <TabsContent value="claim" className="space-y-4">
              {/* Contract Deployment */}
              <GenericContractDeployer
                config={CONTRACT_CONFIG}
                onDeployed={handleDeployed}
                isDeployed={!!airdropAddress}
                verifierAddress={verifierAddress}
                appAddress={airdropAddress}
              />

              {/* Admin Controls */}
              {airdropAddress && isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{t("adminControls.title") || "Admin Controls"}</span>
                      <Badge variant="outline">{t("adminControls.owner") || "Owner"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t("adminControls.airdropStatus") || "Airdrop Status"}</div>
                        <div className="text-sm text-muted-foreground">
                          {airdropActive
                            ? t("adminControls.airdropActive") || "Airdrop is active"
                            : t("adminControls.airdropNotActive") || "Airdrop not started"}
                        </div>
                      </div>
                      <Badge variant={airdropActive ? "default" : "secondary"}>
                        {airdropActive ? t("adminControls.active") || "Active" : t("adminControls.inactive") || "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      {!airdropActive ? (
                        <Button onClick={initializeAirdrop} disabled={commitments.length === 0 || isInitializing} className="flex-1">
                          {isInitializing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                          {t("adminControls.initializeAirdrop") || "Initialize Airdrop"}
                        </Button>
                      ) : (
                        <Button onClick={endAirdrop} variant="destructive" className="flex-1">
                          <Square className="h-4 w-4 mr-2" />
                          {t("adminControls.endAirdrop") || "End Airdrop"}
                        </Button>
                      )}
                    </div>

                    {commitments.length === 0 && !airdropActive && (
                      <p className="text-xs text-muted-foreground">
                        {t("adminControls.registerFirst") || "Register at least one eligible address first"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Registration & Proof Generation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Register Eligibility */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {t("setup.title") || "Register Eligibility"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {identity ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">{t("setup.registered") || "Registered"}</span>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                          <div>
                            <span className="text-muted-foreground">{t("setup.yourCommitment") || "Your Commitment"}</span>
                            <code className="block text-xs mt-1 font-mono">
                              0x{identity.commitment.toString(16).slice(0, 16)}...
                            </code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t("setup.leafIndex") || "Leaf Index"}</span>
                            <Badge variant="secondary" className="ml-2">
                              {identity.leafIndex}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t("setup.description") || "Register to be eligible for the airdrop."}
                        </p>
                        <Button onClick={registerEligibility} disabled={!isConnected || !airdropAddress || isRegistering} className="w-full">
                          {isRegistering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
                          {t("setup.button") || "Register"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Generate Proof */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {t("claim.title") || "Generate Proof"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {proof ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">{t("claim.proofGenerated") || "Proof Generated"}</span>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("claim.nullifier") || "Nullifier"}</span>
                            <span className="font-mono text-xs">{proof.nullifierHash.slice(0, 10)}...</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t("claim.description") || "Generate a ZK proof to claim anonymously."}
                        </p>

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
                                <span>{t("claim.generating") || "Generating..."}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(elapsedTime)}
                                </span>
                              </div>
                            </motion.div>
                          ) : (
                            <Button
                              onClick={generateClaimProof}
                              disabled={!identity || !airdropActive || !merkleRoot}
                              className="w-full"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {t("claim.button") || "Generate Proof"}
                            </Button>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Claim Panel */}
              {proof && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      {t("submit.title") || "Submit Claim"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hasClaimed ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">{t("submit.claimed") || "Claimed Successfully!"}</span>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t("submit.amount") || "Amount"}</span>
                            <span className="font-bold">{formatEther(claimAmount)} ETH</span>
                          </div>
                        </div>
                        {txHash && (
                          <a
                            href={`https://sepolia.basescan.org/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="w-full">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {t("submit.viewTx") || "View Transaction"}
                            </Button>
                          </a>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t("submit.claimAmount") || "Claim Amount"}</span>
                            <span className="font-bold">{formatEther(claimAmount)} ETH</span>
                          </div>
                        </div>
                        <Button onClick={submitClaim} disabled={isClaiming} className="w-full">
                          {isClaiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
                          {t("submit.button") || "Claim Airdrop"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
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
                        <li>• {t("privacy.hidden.item1") || "Your identity (which commitment you own)"}</li>
                        <li>• {t("privacy.hidden.item2") || "Your secret key"}</li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold">{t("privacy.proven.title") || "What's Proven"}</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• {t("privacy.proven.item1") || "You're in the eligible list (Merkle proof)"}</li>
                        <li>• {t("privacy.proven.item2") || "You haven't claimed before (nullifier)"}</li>
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
                <span>{t("stats.title") || "Airdrop Stats"}</span>
                <Button variant="ghost" size="sm" onClick={refreshContractState} disabled={!airdropAddress || isRefreshing}>
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.totalClaimed") || "Total Claimed"}</span>
                <span className="font-bold">{formatEther(stats.totalClaimed)} ETH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.claimCount") || "Claims"}</span>
                <Badge variant="secondary">{stats.claimCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.remaining") || "Remaining"}</span>
                <span className="font-bold">{formatEther(stats.remaining)} ETH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stats.eligible") || "Eligible"}</span>
                <Badge variant="secondary">{commitments.length}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("contractInfo.title") || "Contract Info"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t("contractInfo.network") || "Network"}:</span>
                <Badge variant="outline" className="ml-2">
                  Base Sepolia
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.verifier") || "Verifier"}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {verifierAddress || t("contractInfo.notDeployed") || "Not deployed"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.airdropContract") || "Airdrop Contract"}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {airdropAddress || t("contractInfo.notDeployed") || "Not deployed"}
                </div>
              </div>
              {airdropAddress && (
                <a
                  href={`https://sepolia.basescan.org/address/${airdropAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
