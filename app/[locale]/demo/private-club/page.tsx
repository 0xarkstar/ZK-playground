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
import { MerkleTree } from "@/lib/zk/merkle";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  CheckCircle2,
  Info,
  ExternalLink,
  RefreshCw,
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  Star,
  Sparkles,
  Lock,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LiveBadge } from "@/components/demo/LiveBadge";
import { poseidonHash, generateIdentitySecret } from "@/lib/zk/poseidon";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import {
  MEMBERSHIP_WASM_PATH,
  MEMBERSHIP_ZKEY_PATH,
  MEMBERSHIP_VKEY_PATH,
  VERIFIER_ABI,
  PRIVATE_CLUB_ABI,
  MEMBERSHIP_VERIFIER_BYTECODE,
  PRIVATE_CLUB_BYTECODE,
  TREE_DEPTH,
} from "@/lib/web3/contracts";

const TIERS = {
  1: { name: "Basic", icon: <Users className="h-4 w-4" />, color: "bg-gray-500" },
  2: { name: "Premium", icon: <Star className="h-4 w-4" />, color: "bg-blue-500" },
  3: { name: "VIP", icon: <Crown className="h-4 w-4" />, color: "bg-yellow-500" },
};

interface Member {
  commitment: bigint;
  commitmentHex: string;
  tier: number;
  joinDate: number;
}

interface MyMembership {
  memberId: bigint;
  memberSecret: bigint;
  commitment: bigint;
  tier: number;
  joinDate: number;
  leafIndex: number;
}

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
  nullifierHash: string;
}

const privateClubConfig: DemoContractConfig = {
  name: "Private Club",
  verifierAbi: VERIFIER_ABI,
  verifierBytecode: MEMBERSHIP_VERIFIER_BYTECODE,
  appAbi: PRIVATE_CLUB_ABI,
  appBytecode: PRIVATE_CLUB_BYTECODE,
  verifierLabel: "Membership Verifier",
  appLabel: "Private Club Contract",
};

export default function PrivateClubDemoPage() {
  const t = useTranslations("demo.privateClub");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [clubAddress, setClubAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Club state
  const [members, setMembers] = useState<Member[]>([]);
  const [myMembership, setMyMembership] = useState<MyMembership | null>(null);
  const [selectedTier, setSelectedTier] = useState(2);
  const [merkleRoot, setMerkleRoot] = useState<bigint | null>(null);

  // Verification state
  const [verifyMinTier, setVerifyMinTier] = useState(1);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; action: string; isValid: boolean } | null>(null);

  // UI state
  const [isJoining, setIsJoining] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [showProofDetails, setShowProofDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clubContract = clubAddress as `0x${string}` | null;

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

  // Initialize dummy members
  useEffect(() => {
    const initDummyMembers = async () => {
      const dummyMembers: Member[] = [];
      const tiers = [3, 2, 1];
      const dates = [365, 180, 30];

      for (let i = 0; i < 3; i++) {
        const memberId = generateIdentitySecret();
        const memberSecret = generateIdentitySecret();
        const tier = tiers[i];
        const joinDate = Math.floor((Date.now() - 86400000 * dates[i]) / 1000);

        const commitment = await poseidonHash([
          memberId,
          memberSecret,
          BigInt(tier),
          BigInt(joinDate),
        ]);

        dummyMembers.push({
          commitment,
          commitmentHex: "0x" + commitment.toString(16).slice(0, 8) + "...",
          tier,
          joinDate: joinDate * 1000,
        });
      }

      setMembers(dummyMembers);
    };
    initDummyMembers();
  }, []);

  // Fetch contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !clubContract) return;

    setIsRefreshing(true);
    try {
      const [owner, root, memberCount] = await Promise.all([
        publicClient.readContract({
          address: clubContract,
          abi: PRIVATE_CLUB_ABI,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: clubContract,
          abi: PRIVATE_CLUB_ABI,
          functionName: "merkleRoot",
        }),
        publicClient.readContract({
          address: clubContract,
          abi: PRIVATE_CLUB_ABI,
          functionName: "memberCount",
        }),
      ]);

      setIsOwner(address?.toLowerCase() === (owner as string)?.toLowerCase());
      const rootBigInt = BigInt(root as string);
      if (rootBigInt !== BigInt(0)) {
        setMerkleRoot(rootBigInt);
      }
    } catch (err) {
      console.error("Failed to refresh contract state:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, clubContract, address]);

  useEffect(() => {
    if (clubContract) {
      refreshContractState();
    }
  }, [clubContract, refreshContractState]);

  // Handle contract deployment
  const handleDeployed = (verifier: string, club: string) => {
    setVerifierAddress(verifier);
    setClubAddress(club);
    setIsOwner(true);
  };

  // Join club
  const joinClub = async () => {
    if (!walletClient || !publicClient || !clubContract) return;

    setIsJoining(true);
    setProgress(0);
    setError(null);

    try {
      setStep(t("steps.generatingIdentity"));
      setProgress(20);

      const memberId = generateIdentitySecret();
      const memberSecret = generateIdentitySecret();
      const joinDate = Math.floor(Date.now() / 1000);

      setStep(t("steps.computingCommitment"));
      setProgress(40);

      const commitment = await poseidonHash([
        memberId,
        memberSecret,
        BigInt(selectedTier),
        BigInt(joinDate),
      ]);

      setStep(t("steps.registeringMember"));
      setProgress(60);

      const commitmentBytes = ("0x" + commitment.toString(16).padStart(64, "0")) as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: clubContract,
        abi: PRIVATE_CLUB_ABI,
        functionName: "registerMember",
        args: [commitmentBytes, BigInt(selectedTier)],
      });

      setStep(t("steps.waitingConfirmation"));
      setProgress(80);

      await publicClient.waitForTransactionReceipt({ hash });

      const commitmentHex = "0x" + commitment.toString(16).padStart(64, "0");

      const newMember: Member = {
        commitment,
        commitmentHex: commitmentHex.slice(0, 12) + "...",
        tier: selectedTier,
        joinDate: joinDate * 1000,
      };

      const newMembers = [...members, newMember];
      setMembers(newMembers);

      setMyMembership({
        memberId,
        memberSecret,
        commitment,
        tier: selectedTier,
        joinDate: joinDate * 1000,
        leafIndex: newMembers.length - 1,
      });

      // Update Merkle root on-chain
      setStep(t("steps.updatingMerkleRoot"));
      setProgress(90);

      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();
      await tree.insertMany(newMembers.map(m => m.commitment));
      const root = tree.getRoot();

      const rootBytes = ("0x" + root.toString(16).padStart(64, "0")) as `0x${string}`;

      const rootHash = await walletClient.writeContract({
        address: clubContract,
        abi: PRIVATE_CLUB_ABI,
        functionName: "updateMerkleRoot",
        args: [rootBytes],
      });

      await publicClient.waitForTransactionReceipt({ hash: rootHash });

      setMerkleRoot(root);

      setStep(t("steps.complete"));
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setIsJoining(false);
    }
  };

  // Verify membership
  const verifyMembership = async (action: string) => {
    if (!myMembership || !address || !walletClient || !publicClient || !clubContract || !merkleRoot) return;

    setIsVerifying(true);
    setProgress(0);
    setVerifyResult(null);
    setProofData(null);
    setError(null);

    try {
      // Build Merkle tree
      setStep(t("steps.buildingTree"));
      setProgress(10);

      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();

      for (const member of members) {
        await tree.insert(member.commitment);
      }

      // Get Merkle proof
      setStep(t("steps.generatingMerkle"));
      setProgress(20);

      const merkleProof = await tree.getProof(myMembership.leafIndex);

      // Compute nullifier hash
      setStep(t("steps.computingNullifier"));
      setProgress(25);

      const actionId = BigInt(action.length);
      const nullifierHash = await poseidonHash([myMembership.memberId, actionId]);

      // Prepare circuit inputs
      setStep(t("steps.preparingInputs"));
      setProgress(30);

      const joinDateSeconds = Math.floor(myMembership.joinDate / 1000);
      const minJoinDate = 0;
      const maxJoinDate = Math.floor(Date.now() / 1000) + 86400;

      const circuitInput = {
        memberId: myMembership.memberId.toString(),
        memberSecret: myMembership.memberSecret.toString(),
        membershipTier: myMembership.tier.toString(),
        joinDate: joinDateSeconds.toString(),
        pathElements: merkleProof.pathElements.map(e => e.toString()),
        pathIndices: merkleProof.pathIndices.map(i => i.toString()),
        merkleRoot: merkleRoot.toString(),
        minTier: verifyMinTier.toString(),
        minJoinDate: minJoinDate.toString(),
        maxJoinDate: maxJoinDate.toString(),
        actionId: actionId.toString(),
        nullifierHash: nullifierHash.toString(),
      };

      // Generate proof
      setStep(t("steps.generatingProof"));
      setProgress(35);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        MEMBERSHIP_WASM_PATH,
        MEMBERSHIP_ZKEY_PATH,
        (p, msg) => {
          setProgress(35 + (p * 0.35));
          setStep(msg);
        }
      );

      // Verify proof locally
      setStep(t("steps.verifyingProof"));
      setProgress(75);

      const isValid = await verifyProof(MEMBERSHIP_VKEY_PATH, publicSignals, proof);

      // Format proof
      setStep(t("steps.formattingProof"));
      setProgress(80);

      const calldata = await exportSolidityCalldata(proof, publicSignals);
      const parsed = parseCalldata(calldata);

      const proofResult: ProofData = {
        pA: parsed.pA,
        pB: parsed.pB,
        pC: parsed.pC,
        pubSignals: parsed.pubSignals,
        nullifierHash: nullifierHash.toString(),
      };

      setProofData(proofResult);

      // Submit to contract
      setStep(t("steps.submittingOnChain"));
      setProgress(85);

      const hash = await walletClient.writeContract({
        address: clubContract,
        abi: PRIVATE_CLUB_ABI,
        functionName: "verifyMembership",
        args: [
          parsed.pA.map(BigInt) as [bigint, bigint],
          parsed.pB.map(row => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
          parsed.pC.map(BigInt) as [bigint, bigint],
          BigInt(verifyMinTier),
          nullifierHash,
          actionId,
        ],
      });

      setStep(t("steps.waitingConfirmation"));
      setProgress(95);

      await publicClient.waitForTransactionReceipt({ hash });

      // Determine access result
      const tierMet = myMembership.tier >= verifyMinTier;

      setStep(tierMet && isValid ? t("steps.accessGranted") : t("steps.accessDenied"));
      setProgress(100);

      setVerifyResult({ verified: tierMet && isValid, action, isValid });
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to verify membership");
      setVerifyResult({ verified: false, action, isValid: false });
    } finally {
      setIsVerifying(false);
    }
  };

  const currentStep = !clubAddress
    ? 0
    : !myMembership
    ? 1
    : !merkleRoot
    ? 2
    : !verifyResult
    ? 3
    : verifyResult.verified
    ? 5
    : 4;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") },
    { step: 1, name: t("progress.joinClub") },
    { step: 2, name: t("progress.updateRoot") },
    { step: 3, name: t("progress.verifyAccess") },
    { step: 4, name: t("progress.accessDenied") },
    { step: 5, name: t("progress.accessGranted") },
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

          <Tabs defaultValue="club" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="club">{t("tabs.demo")}</TabsTrigger>
              <TabsTrigger value="how">{t("tabs.howItWorks")}</TabsTrigger>
            </TabsList>

            <TabsContent value="club" className="space-y-4">
              {/* Contract Deployment */}
              <GenericContractDeployer
                config={privateClubConfig}
                onDeployed={handleDeployed}
                isDeployed={!!clubAddress}
                verifierAddress={verifierAddress}
                appAddress={clubAddress}
              />

              {/* Club Panels */}
              {clubAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Join Club */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {t("join.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && !isVerifying && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {!myMembership ? (
                        <>
                          <p className="text-sm text-muted-foreground">{t("join.description")}</p>

                          <div>
                            <label className="text-sm text-muted-foreground">{t("join.selectTier")}</label>
                            <div className="flex gap-2 mt-2">
                              {Object.entries(TIERS).map(([key, tier]) => (
                                <Button
                                  key={key}
                                  variant={selectedTier === Number(key) ? "default" : "outline"}
                                  className="flex-1"
                                  onClick={() => setSelectedTier(Number(key))}
                                >
                                  {tier.icon}
                                  <span className="ml-1">{tier.name}</span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          <AnimatePresence mode="wait">
                            {isJoining ? (
                              <motion.div key="joining" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                                <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /><span>{step}</span></div>
                                <Progress value={progress} className="h-2" />
                              </motion.div>
                            ) : (
                              <Button onClick={joinClub} disabled={!isConnected} className="w-full">
                                <Sparkles className="h-4 w-4 mr-2" />{t("join.button")}
                              </Button>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <span className="font-medium">{t("join.success")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={TIERS[myMembership.tier as keyof typeof TIERS].color + " text-white"}>
                                {TIERS[myMembership.tier as keyof typeof TIERS].icon}
                                <span className="ml-1">{TIERS[myMembership.tier as keyof typeof TIERS].name}</span>
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {t("join.memberSince")} {new Date(myMembership.joinDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-muted rounded-lg text-xs">
                            <span className="text-muted-foreground">{t("join.commitment")}</span>
                            <code className="block mt-1">0x{myMembership.commitment.toString(16).slice(0, 30)}...</code>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Access Control */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {t("access.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && isVerifying && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <p className="text-sm text-muted-foreground">{t("access.description")}</p>

                      <div>
                        <label className="text-sm text-muted-foreground">{t("access.minTier")}</label>
                        <div className="flex gap-2 mt-2">
                          {Object.entries(TIERS).map(([key, tier]) => (
                            <Button
                              key={key}
                              variant={verifyMinTier === Number(key) ? "default" : "outline"}
                              size="sm"
                              onClick={() => setVerifyMinTier(Number(key))}
                            >
                              {tier.name}+
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {["voteOnProposal", "accessPremiumContent", "joinExclusiveChat", "claimReward"].map((action) => (
                          <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            onClick={() => verifyMembership(action)}
                            disabled={!myMembership || isVerifying || !isConnected || !merkleRoot}
                          >
                            {t(`access.actions.${action}`)}
                          </Button>
                        ))}
                      </div>

                      {isVerifying && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
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
                      )}

                      {verifyResult && (
                        <div className="space-y-3">
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-lg ${verifyResult.verified ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}
                          >
                            <div className="flex items-center gap-2">
                              {verifyResult.verified ? (
                                <><CheckCircle className="h-5 w-5 text-green-500" /><span className="font-medium text-green-600">{t("access.granted")}</span></>
                              ) : (
                                <><XCircle className="h-5 w-5 text-red-500" /><span className="font-medium text-red-600">{t("access.denied")}</span></>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {verifyResult.verified ? t("access.grantedDesc") : t("access.deniedDesc", { minTier: TIERS[verifyMinTier as keyof typeof TIERS].name })}
                            </p>
                          </motion.div>

                          {proofData && (
                            <div className="space-y-2">
                              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">{t("access.proofValid")}</span>
                                  <Badge variant={verifyResult.isValid ? "default" : "destructive"}>
                                    {verifyResult.isValid ? common("yes") : common("no")}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">{t("access.nullifier")}</span>
                                  <span className="font-mono text-xs">{proofData.nullifierHash.slice(0, 10)}...</span>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                onClick={() => setShowProofDetails(!showProofDetails)}
                              >
                                {showProofDetails ? (
                                  <><ChevronUp className="h-4 w-4 mr-2" />{t("access.hideProof")}</>
                                ) : (
                                  <><ChevronDown className="h-4 w-4 mr-2" />{t("access.showProof")}</>
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
                                        <span className="text-sm font-medium">{t("access.proofData")}</span>
                                      </div>
                                      <pre className="text-xs overflow-x-auto font-mono max-h-32 overflow-y-auto">
                                        {JSON.stringify(
                                          { pA: proofData.pA, pB: proofData.pB, pC: proofData.pC },
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
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Club Members */}
              {clubAddress && (
                <Card>
                  <CardHeader><CardTitle>{t("members.title")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {members.map((member, i) => (
                        <div key={i} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className={TIERS[member.tier as keyof typeof TIERS].color + " text-white"}>
                              {TIERS[member.tier as keyof typeof TIERS].icon}
                              <span className="ml-1">{TIERS[member.tier as keyof typeof TIERS].name}</span>
                            </Badge>
                          </div>
                          <code className="text-xs">{member.commitmentHex}</code>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(member.joinDate).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="how" className="space-y-4">
              {/* Privacy Features */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader><CardTitle>{t("privacy.title")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-background rounded-lg">
                      <Lock className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium">{t("privacy.anonymous.title")}</h4>
                      <p className="text-sm text-muted-foreground">{t("privacy.anonymous.description")}</p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <Shield className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium">{t("privacy.attributes.title")}</h4>
                      <p className="text-sm text-muted-foreground">{t("privacy.attributes.description")}</p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <Sparkles className="h-5 w-5 text-primary mb-2" />
                      <h4 className="font-medium">{t("privacy.rateLimit.title")}</h4>
                      <p className="text-sm text-muted-foreground">{t("privacy.rateLimit.description")}</p>
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
                  disabled={!clubAddress || isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stats.totalMembers")}</span>
                <Badge variant="secondary">{members.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stats.vipMembers")}</span>
                <Badge variant="secondary">{members.filter(m => m.tier === 3).length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("stats.yourTier")}</span>
                <Badge variant={myMembership ? "default" : "secondary"}>
                  {myMembership ? TIERS[myMembership.tier as keyof typeof TIERS].name : t("stats.notMember")}
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
                <span className="text-muted-foreground">{t("contractInfo.clubContract")}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {clubAddress || t("contractInfo.notDeployed")}
                </div>
              </div>
              {clubAddress && (
                <a
                  href={`https://sepolia.basescan.org/address/${clubAddress}`}
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
