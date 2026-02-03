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
  Shuffle,
  Shield,
  CheckCircle,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { poseidonHashTwo, generateIdentitySecret } from "@/lib/zk/poseidon";
import { MerkleTree } from "@/lib/zk/merkle";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import { MIXER_WASM_PATH, MIXER_ZKEY_PATH, MIXER_VKEY_PATH, TREE_DEPTH } from "@/lib/web3/contracts";
import { useTranslations } from "next-intl";
import { useAccount } from "wagmi";

interface Deposit {
  commitment: bigint;
  commitmentHex: string;
  timestamp: number;
}

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
  nullifierHash: string;
}

export function MixerDemo() {
  const t = useTranslations("demo.mixer");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [myDeposit, setMyDeposit] = useState<{
    nullifier: bigint;
    secret: bigint;
    commitment: bigint;
    leafIndex: number;
  } | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [withdrawn, setWithdrawn] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showProofDetails, setShowProofDetails] = useState(false);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with some dummy deposits
  useEffect(() => {
    const initDummyDeposits = async () => {
      const dummyDeposits: Deposit[] = [];
      for (let i = 0; i < 3; i++) {
        const nullifier = generateIdentitySecret();
        const secret = generateIdentitySecret();
        const commitment = await poseidonHashTwo(nullifier, secret);
        dummyDeposits.push({
          commitment,
          commitmentHex: "0x" + commitment.toString(16).slice(0, 8) + "...",
          timestamp: Date.now() - (3600000 * (i + 1)),
        });
      }
      setDeposits(dummyDeposits);
    };
    initDummyDeposits();
  }, []);

  // Timer for proof generation
  useEffect(() => {
    if (isWithdrawing) {
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
  }, [isWithdrawing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const deposit = async () => {
    setIsDepositing(true);
    setProgress(0);
    setError(null);

    try {
      setStep(t("steps.generatingSecrets"));
      setProgress(20);

      const nullifier = generateIdentitySecret();
      const secret = generateIdentitySecret();

      setStep(t("steps.computingCommitment"));
      setProgress(50);

      const commitment = await poseidonHashTwo(nullifier, secret);
      const commitmentHex = "0x" + commitment.toString(16).padStart(64, "0");

      setStep(t("steps.submittingDeposit"));
      setProgress(80);

      const newDeposit: Deposit = {
        commitment,
        commitmentHex: commitmentHex.slice(0, 12) + "...",
        timestamp: Date.now(),
      };

      const newDeposits = [...deposits, newDeposit];
      setDeposits(newDeposits);

      setMyDeposit({
        nullifier,
        secret,
        commitment,
        leafIndex: newDeposits.length - 1,
      });

      setStep(t("steps.depositComplete"));
      setProgress(100);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  const withdraw = async () => {
    if (!myDeposit || !address) return;

    setIsWithdrawing(true);
    setProgress(0);
    setError(null);
    setProofData(null);
    setIsVerified(false);

    try {
      // Step 1: Build Merkle tree
      setStep(t("steps.buildingTree"));
      setProgress(10);

      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();

      for (const dep of deposits) {
        await tree.insert(dep.commitment);
      }

      const merkleRoot = tree.getRoot();

      // Step 2: Get Merkle proof
      setStep(t("steps.generatingMerkle"));
      setProgress(20);

      const merkleProof = await tree.getProof(myDeposit.leafIndex);

      // Step 3: Compute nullifier hash
      setStep(t("steps.computingNullifier"));
      setProgress(30);

      const nullifierHash = await poseidonHashTwo(myDeposit.nullifier, merkleRoot);

      // Step 4: Prepare circuit inputs
      setStep(t("steps.preparingInputs"));
      setProgress(35);

      const recipientAddress = BigInt(address);
      const relayerAddress = BigInt(0); // No relayer for demo
      const fee = BigInt(0); // No fee for demo

      const circuitInput = {
        // Private inputs
        nullifier: myDeposit.nullifier.toString(),
        secret: myDeposit.secret.toString(),
        pathElements: merkleProof.pathElements.map(e => e.toString()),
        pathIndices: merkleProof.pathIndices.map(i => i.toString()),
        // Public inputs
        merkleRoot: merkleRoot.toString(),
        nullifierHash: nullifierHash.toString(),
        recipient: recipientAddress.toString(),
        relayer: relayerAddress.toString(),
        fee: fee.toString(),
      };

      // Step 5: Generate proof
      setStep(t("steps.generatingProof"));
      setProgress(40);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        MIXER_WASM_PATH,
        MIXER_ZKEY_PATH,
        (p, msg) => {
          setProgress(40 + (p * 0.35));
          setStep(msg);
        }
      );

      // Step 6: Verify proof
      setStep(t("steps.verifyingProof"));
      setProgress(80);

      const isValid = await verifyProof(MIXER_VKEY_PATH, publicSignals, proof);

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

      setStep(t("steps.withdrawing"));
      setProgress(95);

      setWithdrawn(true);
      setProofData(proofResult);
      setIsVerified(isValid);

      setStep(t("steps.withdrawComplete"));
      setProgress(100);
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("disclaimer.title")}</AlertTitle>
        <AlertDescription>{t("disclaimer.description")}</AlertDescription>
      </Alert>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>{t("intro.title")}</AlertTitle>
        <AlertDescription>{t("intro.description")}</AlertDescription>
      </Alert>

      {/* Flow Diagram */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="text-center p-4 bg-muted rounded-lg min-w-[120px]">
              <div className="text-2xl mb-1">A</div>
              <div className="text-sm font-medium">{t("flow.depositor")}</div>
              <div className="text-xs text-muted-foreground">{t("flow.depositAmount")}</div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center p-4 bg-primary/10 rounded-lg min-w-[120px]">
              <Shuffle className="h-6 w-6 mx-auto mb-1 text-primary" />
              <div className="text-sm font-medium">{t("flow.mixerPool")}</div>
              <div className="text-xs text-muted-foreground">{deposits.length} {t("flow.deposits")}</div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center p-4 bg-muted rounded-lg min-w-[120px]">
              <div className="text-2xl mb-1">B</div>
              <div className="text-sm font-medium">{t("flow.withdrawer")}</div>
              <div className="text-xs text-muted-foreground">{t("flow.unlinkable")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="demo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="demo">{t("tabs.demo")}</TabsTrigger>
          <TabsTrigger value="how">{t("tabs.howItWorks")}</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deposit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Lock className="h-5 w-5" />{t("deposit.title")}</div>
                  {myDeposit && (
                    <Button variant="ghost" size="sm" onClick={() => setShowSecrets(!showSecrets)}>
                      {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && !isWithdrawing && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {!myDeposit ? (
                  <>
                    <p className="text-sm text-muted-foreground">{t("deposit.description")}</p>
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <div className="text-2xl font-bold">0.01 ETH</div>
                      <div className="text-sm text-muted-foreground">{t("deposit.fixedAmount")}</div>
                    </div>

                    <AnimatePresence mode="wait">
                      {isDepositing ? (
                        <motion.div key="depositing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /><span>{step}</span></div>
                          <Progress value={progress} className="h-2" />
                        </motion.div>
                      ) : (
                        <Button onClick={deposit} disabled={!isConnected} className="w-full">
                          <Lock className="h-4 w-4 mr-2" />{t("deposit.button")}
                        </Button>
                      )}
                    </AnimatePresence>

                    {!isConnected && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t("deposit.connectWallet")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500 inline mr-2" />
                      <span className="text-sm font-medium">{t("deposit.success")}</span>
                    </div>

                    {showSecrets && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-muted rounded-lg text-xs space-y-2">
                        <div>
                          <span className="text-muted-foreground">{t("deposit.nullifier")}</span>
                          <code className="block mt-1 break-all">{myDeposit.nullifier.toString(16).slice(0, 30)}...</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("deposit.secret")}</span>
                          <code className="block mt-1 break-all">{myDeposit.secret.toString(16).slice(0, 30)}...</code>
                        </div>
                      </motion.div>
                    )}

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{t("deposit.saveNote")}</AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Withdraw */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{t("withdraw.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && isWithdrawing && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {withdrawn ? (
                  <div className="space-y-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <h4 className="font-bold text-green-600">{t("withdraw.success")}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{t("withdraw.successDesc")}</p>
                    </motion.div>

                    {proofData && (
                      <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("withdraw.verified")}</span>
                            <Badge variant={isVerified ? "default" : "destructive"}>
                              {isVerified ? common("yes") : common("no")}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("withdraw.nullifier")}</span>
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
                            <><ChevronUp className="h-4 w-4 mr-2" />{t("withdraw.hideProof")}</>
                          ) : (
                            <><ChevronDown className="h-4 w-4 mr-2" />{t("withdraw.showProof")}</>
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
                                  <span className="text-sm font-medium">{t("withdraw.proofData")}</span>
                                </div>
                                <pre className="text-xs overflow-x-auto font-mono max-h-40 overflow-y-auto">
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
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">{t("withdraw.description")}</p>

                    <AnimatePresence mode="wait">
                      {isWithdrawing ? (
                        <motion.div key="withdrawing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
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
                        <Button onClick={withdraw} disabled={!myDeposit || !isConnected} className="w-full">
                          <Shield className="h-4 w-4 mr-2" />{t("withdraw.button")}
                        </Button>
                      )}
                    </AnimatePresence>

                    {!isConnected && myDeposit && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t("withdraw.connectWallet")}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pool State */}
          <Card>
            <CardHeader><CardTitle>{t("pool.title")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">{deposits.length}</div>
                  <div className="text-xs text-muted-foreground">{t("pool.totalDeposits")}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">{(deposits.length * 0.01).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{t("pool.totalValue")}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">0.01</div>
                  <div className="text-xs text-muted-foreground">{t("pool.denomination")}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">{deposits.length}</div>
                  <div className="text-xs text-muted-foreground">{t("pool.anonymitySet")}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t("pool.recentDeposits")}</h4>
                {deposits.slice(-5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                    <code className="text-xs">{d.commitmentHex}</code>
                    <span className="text-xs text-muted-foreground">
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="how">
          {/* Privacy Explanation */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader><CardTitle>{t("privacy.title")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">{t("privacy.hidden.title")}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>- {t("privacy.hidden.item1")}</li>
                    <li>- {t("privacy.hidden.item2")}</li>
                    <li>- {t("privacy.hidden.item3")}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">{t("privacy.proven.title")}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>- {t("privacy.proven.item1")}</li>
                    <li>- {t("privacy.proven.item2")}</li>
                    <li>- {t("privacy.proven.item3")}</li>
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
