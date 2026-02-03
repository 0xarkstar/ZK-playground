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
  Gift,
  Shield,
  CheckCircle,
  Loader2,
  Info,
  Users,
  Lock,
  Wallet,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Rocket,
} from "lucide-react";
import { poseidonHashSingle, poseidonHashTwo, generateIdentitySecret } from "@/lib/zk/poseidon";
import { MerkleTree } from "@/lib/zk/merkle";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import { AIRDROP_WASM_PATH, AIRDROP_ZKEY_PATH, AIRDROP_VKEY_PATH, TREE_DEPTH } from "@/lib/web3/contracts";
import { useTranslations } from "next-intl";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
  nullifierHash: string;
}

export function AirdropDemo() {
  const t = useTranslations("demo.airdrop");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();

  // State
  const [userSecret, setUserSecret] = useState<bigint | null>(null);
  const [userCommitment, setUserCommitment] = useState<bigint | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<bigint | null>(null);
  const [leafIndex, setLeafIndex] = useState<number>(0);
  const [commitments, setCommitments] = useState<bigint[]>([]);

  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");

  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showProofDetails, setShowProofDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer for proof generation
  useEffect(() => {
    if (isGeneratingProof) {
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
  }, [isGeneratingProof]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const setupAirdrop = async () => {
    setIsSettingUp(true);
    setProgress(0);
    setError(null);

    try {
      setStep(t("steps.generatingSecret"));
      setProgress(20);

      const secret = generateIdentitySecret();
      setUserSecret(secret);

      setStep(t("steps.computingCommitment"));
      setProgress(40);

      const commitment = await poseidonHashSingle(secret);
      setUserCommitment(commitment);

      setStep(t("steps.buildingTree"));
      setProgress(60);

      // Build Merkle tree with user's commitment + dummy commitments
      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();

      const allCommitments: bigint[] = [commitment];
      await tree.insert(commitment);

      // Add dummy commitments for demo
      for (let i = 0; i < 3; i++) {
        const dummyCommitment = await poseidonHashSingle(generateIdentitySecret());
        allCommitments.push(dummyCommitment);
        await tree.insert(dummyCommitment);
      }

      setCommitments(allCommitments);
      setLeafIndex(0); // User is at index 0

      setStep(t("steps.computingRoot"));
      setProgress(80);

      const root = tree.getRoot();
      setMerkleRoot(root);

      setStep(t("steps.complete"));
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setIsSettingUp(false);
    }
  };

  const generateClaimProof = async () => {
    if (!userSecret || !merkleRoot || !address) return;

    setIsGeneratingProof(true);
    setProgress(0);
    setError(null);
    setProofData(null);
    setIsVerified(false);

    try {
      // Step 1: Build Merkle tree and get proof
      setStep(t("steps.buildingTree"));
      setProgress(10);

      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();
      await tree.insertMany(commitments);

      setStep(t("steps.generatingMerkle"));
      setProgress(20);

      const merkleProof = await tree.getProof(leafIndex);

      // Step 2: Compute nullifier hash
      setStep(t("steps.computingNullifier"));
      setProgress(30);

      const nullifierHash = await poseidonHashTwo(userSecret, merkleRoot);

      // Step 3: Prepare circuit inputs
      setStep(t("steps.preparingInputs"));
      setProgress(40);

      const recipientAddress = BigInt(address);
      const claimAmount = BigInt(100); // Demo amount

      const circuitInput = {
        // Private inputs
        secret: userSecret.toString(),
        pathElements: merkleProof.pathElements.map(e => e.toString()),
        pathIndices: merkleProof.pathIndices.map(i => i.toString()),
        // Public inputs
        merkleRoot: merkleRoot.toString(),
        nullifierHash: nullifierHash.toString(),
        recipient: recipientAddress.toString(),
        amount: claimAmount.toString(),
      };

      // Step 4: Generate proof using snarkjs
      setStep(t("steps.generatingProof"));
      setProgress(50);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        AIRDROP_WASM_PATH,
        AIRDROP_ZKEY_PATH,
        (p, msg) => {
          setProgress(50 + (p * 0.3));
          setStep(msg);
        }
      );

      // Step 5: Verify proof locally
      setStep(t("steps.verifyingProof"));
      setProgress(85);

      const isValid = await verifyProof(AIRDROP_VKEY_PATH, publicSignals, proof);

      // Step 6: Format proof for Solidity
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

      setProofData(proofResult);
      setIsVerified(isValid);
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsGeneratingProof(false);
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
            {/* Setup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("setup.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("setup.description")}</p>

                {!merkleRoot ? (
                  <AnimatePresence mode="wait">
                    {isSettingUp ? (
                      <motion.div key="setting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{step}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </motion.div>
                    ) : (
                      <Button onClick={setupAirdrop} className="w-full">
                        <Gift className="h-4 w-4 mr-2" />
                        {t("setup.button")}
                      </Button>
                    )}
                  </AnimatePresence>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500 inline mr-2" />
                      <span className="text-sm font-medium">{t("setup.ready")}</span>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                      <div>
                        <span className="text-muted-foreground">{t("setup.merkleRoot")}</span>
                        <code className="block text-xs mt-1 font-mono">
                          0x{merkleRoot.toString(16).slice(0, 16)}...
                        </code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("setup.yourCommitment")}</span>
                        <code className="block text-xs mt-1 font-mono">
                          0x{userCommitment?.toString(16).slice(0, 16)}...
                        </code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("setup.eligibleCount")}</span>
                        <Badge variant="secondary" className="ml-2">{commitments.length}</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate Proof */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("claim.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {proofData ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{t("claim.proofGenerated")}</span>
                    </div>

                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("claim.verified")}</span>
                        <Badge variant={isVerified ? "default" : "destructive"}>
                          {isVerified ? common("yes") : common("no")}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("claim.nullifier")}</span>
                        <span className="font-mono text-xs">
                          {proofData.nullifierHash.slice(0, 10)}...
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("claim.recipient")}</span>
                        <span className="font-mono text-xs">
                          {address?.slice(0, 10)}...
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowProofDetails(!showProofDetails)}
                    >
                      {showProofDetails ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          {t("claim.hideDetails")}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          {t("claim.showDetails")}
                        </>
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
                              <span className="text-sm font-medium">{t("claim.proofData")}</span>
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

                    <Alert className="bg-green-500/10 border-green-500/20">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-sm">
                        {t("claim.readyToClaim")}
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{t("claim.description")}</p>

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
                            <span>{t("claim.generating")}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(elapsedTime)}
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <Button onClick={generateClaimProof} disabled={!merkleRoot || !isConnected} className="w-full">
                          <Shield className="h-4 w-4 mr-2" />
                          {t("claim.button")}
                        </Button>
                      )}
                    </AnimatePresence>

                    {!isConnected && merkleRoot && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t("claim.connectWallet")}
                      </p>
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
              <CardTitle>{t("privacy.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Lock className="h-5 w-5 text-primary mb-2" />
                  <h4 className="font-medium">{t("privacy.hidden.title")}</h4>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• {t("privacy.hidden.item1")}</li>
                    <li>• {t("privacy.hidden.item2")}</li>
                  </ul>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <Shield className="h-5 w-5 text-primary mb-2" />
                  <h4 className="font-medium">{t("privacy.proven.title")}</h4>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• {t("privacy.proven.item1")}</li>
                    <li>• {t("privacy.proven.item2")}</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
