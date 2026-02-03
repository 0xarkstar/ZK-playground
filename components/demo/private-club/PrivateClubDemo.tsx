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
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Crown,
  Star,
  Sparkles,
  Lock,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { poseidonHash, generateIdentitySecret } from "@/lib/zk/poseidon";
import { MerkleTree } from "@/lib/zk/merkle";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import { MEMBERSHIP_WASM_PATH, MEMBERSHIP_ZKEY_PATH, MEMBERSHIP_VKEY_PATH, TREE_DEPTH } from "@/lib/web3/contracts";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";

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

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
  nullifierHash: string;
}

export function PrivateClubDemo() {
  const t = useTranslations("demo.privateClub");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();

  const [members, setMembers] = useState<Member[]>([]);
  const [myMembership, setMyMembership] = useState<{
    memberId: bigint;
    memberSecret: bigint;
    commitment: bigint;
    tier: number;
    joinDate: number;
    leafIndex: number;
  } | null>(null);
  const [selectedTier, setSelectedTier] = useState(2);
  const [isJoining, setIsJoining] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [verifyMinTier, setVerifyMinTier] = useState(1);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; action: string; isValid: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [showProofDetails, setShowProofDetails] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const joinClub = async () => {
    setIsJoining(true);
    setProgress(0);
    setError(null);

    try {
      setStep(t("steps.generatingIdentity"));
      setProgress(25);

      const memberId = generateIdentitySecret();
      const memberSecret = generateIdentitySecret();
      const joinDate = Math.floor(Date.now() / 1000);

      setStep(t("steps.computingCommitment"));
      setProgress(50);

      const commitment = await poseidonHash([
        memberId,
        memberSecret,
        BigInt(selectedTier),
        BigInt(joinDate),
      ]);

      setStep(t("steps.registeringMember"));
      setProgress(75);

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

      setStep(t("steps.complete"));
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setIsJoining(false);
    }
  };

  const verifyMembership = async (action: string) => {
    if (!myMembership || !address) return;

    setIsVerifying(true);
    setProgress(0);
    setVerifyResult(null);
    setProofData(null);
    setError(null);

    try {
      // Step 1: Build Merkle tree
      setStep(t("steps.buildingTree"));
      setProgress(10);

      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();

      for (const member of members) {
        await tree.insert(member.commitment);
      }

      const merkleRoot = tree.getRoot();

      // Step 2: Get Merkle proof
      setStep(t("steps.generatingMerkle"));
      setProgress(20);

      const merkleProof = await tree.getProof(myMembership.leafIndex);

      // Step 3: Compute nullifier hash (action-specific)
      setStep(t("steps.computingNullifier"));
      setProgress(25);

      const actionId = BigInt(action.length); // Simple action ID for demo
      const nullifierHash = await poseidonHash([myMembership.memberId, actionId]);

      // Step 4: Prepare circuit inputs
      setStep(t("steps.preparingInputs"));
      setProgress(30);

      const joinDateSeconds = Math.floor(myMembership.joinDate / 1000);
      const minJoinDate = 0; // No minimum
      const maxJoinDate = Math.floor(Date.now() / 1000) + 86400; // Tomorrow

      const circuitInput = {
        // Private inputs
        memberId: myMembership.memberId.toString(),
        memberSecret: myMembership.memberSecret.toString(),
        membershipTier: myMembership.tier.toString(),
        joinDate: joinDateSeconds.toString(),
        pathElements: merkleProof.pathElements.map(e => e.toString()),
        pathIndices: merkleProof.pathIndices.map(i => i.toString()),
        // Public inputs
        merkleRoot: merkleRoot.toString(),
        minTier: verifyMinTier.toString(),
        minJoinDate: minJoinDate.toString(),
        maxJoinDate: maxJoinDate.toString(),
        actionId: actionId.toString(),
        nullifierHash: nullifierHash.toString(),
      };

      // Step 5: Generate proof
      setStep(t("steps.generatingProof"));
      setProgress(35);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        MEMBERSHIP_WASM_PATH,
        MEMBERSHIP_ZKEY_PATH,
        (p, msg) => {
          setProgress(35 + (p * 0.4));
          setStep(msg);
        }
      );

      // Step 6: Verify proof
      setStep(t("steps.verifyingProof"));
      setProgress(80);

      const isValid = await verifyProof(MEMBERSHIP_VKEY_PATH, publicSignals, proof);

      // Step 7: Format proof
      setStep(t("steps.formattingProof"));
      setProgress(90);

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

                    {!isConnected && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t("join.connectWallet")}
                      </p>
                    )}
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
                      disabled={!myMembership || isVerifying || !isConnected}
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

          {/* Club Members */}
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
        </TabsContent>

        <TabsContent value="how">
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
  );
}
