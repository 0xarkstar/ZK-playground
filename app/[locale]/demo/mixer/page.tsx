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
import { MerkleTree } from "@/lib/zk/merkle";
import { poseidonHashTwo, generateIdentitySecret } from "@/lib/zk/poseidon";
import { generateProof, verifyProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import {
  SIMPLE_MIXER_ABI,
  MIXER_VERIFIER_BYTECODE,
  SIMPLE_MIXER_BYTECODE,
  MIXER_WASM_PATH,
  MIXER_ZKEY_PATH,
  MIXER_VKEY_PATH,
  VERIFIER_ABI,
  TREE_DEPTH,
} from "@/lib/web3/contracts";
import {
  Wallet,
  CheckCircle2,
  Info,
  ExternalLink,
  Shield,
  Loader2,
  RefreshCw,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LiveBadge } from "@/components/demo/LiveBadge";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther, parseEther } from "viem";

interface DepositData {
  nullifier: bigint;
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
  name: "Simple Mixer",
  verifierAbi: VERIFIER_ABI,
  verifierBytecode: MIXER_VERIFIER_BYTECODE,
  appAbi: SIMPLE_MIXER_ABI,
  appBytecode: SIMPLE_MIXER_BYTECODE,
  verifierLabel: "Mixer Verifier",
  appLabel: "SimpleMixer",
};

const DENOMINATION = parseEther("0.01");

export default function MixerDemoPage() {
  const t = useTranslations("demo.mixer");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [mixerAddress, setMixerAddress] = useState<string | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<bigint | null>(null);
  const [depositCount, setDepositCount] = useState(0);
  const [commitments, setCommitments] = useState<bigint[]>([]);
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [proof, setProof] = useState<ProofData | null>(null);
  const [hasDeposited, setHasDeposited] = useState(false);
  const [hasWithdrawn, setHasWithdrawn] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const mixerContract = mixerAddress as `0x${string}` | null;

  const refreshContractState = useCallback(async () => {
    if (!publicClient || !mixerContract) return;
    setIsRefreshing(true);
    try {
      const [root, count, allCommitments] = await Promise.all([
        publicClient.readContract({ address: mixerContract, abi: SIMPLE_MIXER_ABI, functionName: "merkleRoot" }),
        publicClient.readContract({ address: mixerContract, abi: SIMPLE_MIXER_ABI, functionName: "getDepositCount" }),
        publicClient.readContract({ address: mixerContract, abi: SIMPLE_MIXER_ABI, functionName: "getAllCommitments" }),
      ]);
      setMerkleRoot(BigInt(root as string));
      setDepositCount(Number(count));
      setCommitments((allCommitments as `0x${string}`[]).map(c => BigInt(c)));
    } catch (err) {
      console.error("Failed to refresh mixer state:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, mixerContract]);

  useEffect(() => {
    if (mixerContract) refreshContractState();
  }, [mixerContract, refreshContractState]);

  const handleDeployed = (verifier: string, mixer: string) => {
    setVerifierAddress(verifier);
    setMixerAddress(mixer);
  };

  const deposit = async () => {
    if (!walletClient || !publicClient || !mixerContract) return;
    setIsDepositing(true);
    setError(null);
    try {
      const nullifier = generateIdentitySecret();
      const secret = generateIdentitySecret();
      const commitment = await poseidonHashTwo(nullifier, secret);
      const commitmentBytes = ("0x" + commitment.toString(16).padStart(64, "0")) as `0x${string}`;
      const hash = await walletClient.writeContract({
        address: mixerContract, abi: SIMPLE_MIXER_ABI, functionName: "deposit",
        args: [commitmentBytes], value: DENOMINATION,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setDepositData({ nullifier, secret, commitment, leafIndex: depositCount });
      setHasDeposited(true);
      setCommitments(prev => [...prev, commitment]);
      refreshContractState();
    } catch (err) {
      console.error("Deposit error:", err);
      setError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  const generateWithdrawProof = async () => {
    if (!depositData || !merkleRoot || !recipientAddress) return;
    setIsGeneratingProof(true);
    setProgress(0);
    setError(null);
    setProof(null);
    try {
      setStep(t("steps.buildingTree") || "Building tree...");
      setProgress(10);
      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();
      await tree.insertMany(commitments);
      setStep(t("steps.generatingMerkle") || "Generating Merkle proof...");
      setProgress(20);
      const merkleProof = await tree.getProof(depositData.leafIndex);
      setStep(t("steps.computingNullifier") || "Computing nullifier...");
      setProgress(30);
      const nullifierHash = await poseidonHashTwo(depositData.nullifier, BigInt(1));
      setStep(t("steps.preparingInputs") || "Preparing inputs...");
      setProgress(40);
      const circuitInput = {
        nullifier: depositData.nullifier.toString(),
        secret: depositData.secret.toString(),
        pathElements: merkleProof.pathElements.map(e => e.toString()),
        pathIndices: merkleProof.pathIndices.map(i => i.toString()),
        merkleRoot: merkleRoot.toString(),
        nullifierHash: nullifierHash.toString(),
        recipient: BigInt(recipientAddress).toString(),
        relayer: "0", fee: "0",
      };
      setStep(t("steps.generatingProof") || "Generating proof...");
      setProgress(50);
      const { proof, publicSignals } = await generateProof(circuitInput, MIXER_WASM_PATH, MIXER_ZKEY_PATH,
        (p, msg) => { setProgress(50 + p * 0.3); setStep(msg); });
      setStep(t("steps.verifyingProof") || "Verifying...");
      setProgress(85);
      const isValid = await verifyProof(MIXER_VKEY_PATH, publicSignals, proof);
      if (!isValid) throw new Error("Proof verification failed");
      setStep(t("steps.formattingProof") || "Formatting...");
      setProgress(95);
      const calldata = await exportSolidityCalldata(proof, publicSignals);
      const parsed = parseCalldata(calldata);
      setStep(t("steps.complete") || "Complete!");
      setProgress(100);
      setProof({ pA: parsed.pA, pB: parsed.pB, pC: parsed.pC, pubSignals: parsed.pubSignals, nullifierHash: nullifierHash.toString() });
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const withdraw = async () => {
    if (!walletClient || !publicClient || !mixerContract || !proof || !merkleRoot || !recipientAddress) return;
    setIsWithdrawing(true);
    setError(null);
    try {
      const rootBytes = ("0x" + merkleRoot.toString(16).padStart(64, "0")) as `0x${string}`;
      const nullifierBytes = ("0x" + BigInt(proof.nullifierHash).toString(16).padStart(64, "0")) as `0x${string}`;
      const hash = await walletClient.writeContract({
        address: mixerContract, abi: SIMPLE_MIXER_ABI, functionName: "withdraw",
        args: [
          proof.pA.map(BigInt) as [bigint, bigint],
          proof.pB.map((row) => row.map(BigInt)) as [[bigint, bigint], [bigint, bigint]],
          proof.pC.map(BigInt) as [bigint, bigint],
          rootBytes, nullifierBytes,
          recipientAddress as `0x${string}`,
          "0x0000000000000000000000000000000000000000" as `0x${string}`,
          BigInt(0),
        ],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxHash(hash);
      setHasWithdrawn(true);
      refreshContractState();
    } catch (err) {
      console.error("Withdraw error:", err);
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const currentStep = !mixerAddress ? 0 : !hasDeposited ? 1 : !proof ? 2 : !hasWithdrawn ? 3 : 4;
  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") || "Deploy Contracts" },
    { step: 1, name: t("progress.deposit") || "Deposit" },
    { step: 2, name: t("progress.generateProof") || "Generate Proof" },
    { step: 3, name: t("progress.withdraw") || "Withdraw" },
    { step: 4, name: t("progress.complete") || "Complete" },
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
          <Alert variant="destructive" className="border-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-400">{t("disclaimer.title") || "Educational Only"}</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">{t("disclaimer.description") || "This demo is for educational purposes only."}</AlertDescription>
          </Alert>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{t("realBlockchainAlert.title") || "Real Blockchain"}</AlertTitle>
            <AlertDescription>{t("realBlockchainAlert.description") || "This demo uses real contracts on Base Sepolia."} <FaucetLink />.</AlertDescription>
          </Alert>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />{t("walletConnection") || "Wallet Connection"}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ConnectButton chainStatus="icon" showBalance={false} />
              {isConnected && <WalletBalance />}
            </CardContent>
          </Card>

          <Tabs defaultValue="mixer" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mixer">{t("tabs.demo") || "Demo"}</TabsTrigger>
              <TabsTrigger value="how">{t("tabs.howItWorks") || "How It Works"}</TabsTrigger>
            </TabsList>

            <TabsContent value="mixer" className="space-y-4">
              <GenericContractDeployer config={CONTRACT_CONFIG} onDeployed={handleDeployed} isDeployed={!!mixerAddress} verifierAddress={verifierAddress} appAddress={mixerAddress} />

              {mixerAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5" />{t("deposit.title") || "Deposit"}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {hasDeposited ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">{t("deposit.deposited") || "Deposited"}</span></div>
                          <div className="p-3 bg-muted rounded-lg text-sm">
                            <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("deposit.amount") || "Amount"}</span><span className="font-bold">{formatEther(DENOMINATION)} ETH</span></div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">{t("deposit.description") || "Deposit a fixed amount to the pool."}</p>
                          <div className="p-3 bg-muted rounded-lg"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t("deposit.fixedAmount") || "Fixed Amount"}</span><span className="font-bold">{formatEther(DENOMINATION)} ETH</span></div></div>
                          <Button onClick={deposit} disabled={isDepositing || !isConnected} className="w-full">
                            {isDepositing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowDownToLine className="h-4 w-4 mr-2" />}
                            {t("deposit.button") || "Deposit"}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><ArrowUpFromLine className="h-5 w-5" />{t("withdraw.title") || "Withdraw"}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {hasWithdrawn ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">{t("withdraw.withdrawn") || "Withdrawn"}</span></div>
                          {txHash && (<a href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full"><ExternalLink className="h-4 w-4 mr-2" />{t("withdraw.viewTx") || "View Transaction"}</Button></a>)}
                        </div>
                      ) : proof ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">{t("withdraw.proofReady") || "Proof Ready"}</span></div>
                          <Button onClick={withdraw} disabled={isWithdrawing} className="w-full">{isWithdrawing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4 mr-2" />}{t("withdraw.button") || "Withdraw"}</Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2"><Label>{t("withdraw.recipient") || "Recipient Address"}</Label><Input placeholder="0x..." value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} /></div>
                          {error && (<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>)}
                          <AnimatePresence mode="wait">
                            {isGeneratingProof ? (
                              <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /><span className="flex-1">{step}</span></div>
                                <Progress value={progress} className="h-2" />
                                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{t("withdraw.generating") || "Generating..."}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(elapsedTime)}</span></div>
                              </motion.div>
                            ) : (
                              <Button onClick={generateWithdrawProof} disabled={!hasDeposited || !recipientAddress} className="w-full"><Shield className="h-4 w-4 mr-2" />{t("withdraw.generateProof") || "Generate Proof"}</Button>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="how">
              <Card>
                <CardHeader><CardTitle>{t("privacy.title") || "How It Works"}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4"><h4 className="font-semibold">{t("privacy.hidden.title") || "What's Hidden"}</h4><ul className="text-sm text-muted-foreground space-y-2"><li>• {t("privacy.hidden.item1") || "Link between deposit and withdrawal"}</li><li>• {t("privacy.hidden.item2") || "Your nullifier and secret"}</li></ul></div>
                    <div className="space-y-4"><h4 className="font-semibold">{t("privacy.proven.title") || "What's Proven"}</h4><ul className="text-sm text-muted-foreground space-y-2"><li>• {t("privacy.proven.item1") || "You made a valid deposit"}</li><li>• {t("privacy.proven.item2") || "You haven't withdrawn before"}</li></ul></div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("progress.title") || "Progress"}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressSteps.map((item) => (<div key={item.step} className="flex items-center gap-3"><div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep > item.step ? "bg-green-500 text-white" : currentStep === item.step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{currentStep > item.step ? <CheckCircle2 className="h-4 w-4" /> : item.step}</div><span className={currentStep >= item.step ? "font-medium" : "text-muted-foreground"}>{item.name}</span></div>))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center justify-between text-lg"><span>{t("poolStatus.title") || "Pool Status"}</span><Button variant="ghost" size="sm" onClick={refreshContractState} disabled={!mixerAddress || isRefreshing}><RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} /></Button></CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("poolStatus.denomination") || "Denomination"}</span><span className="font-bold">{formatEther(DENOMINATION)} ETH</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">{t("poolStatus.deposits") || "Deposits"}</span><Badge variant="secondary">{depositCount}</Badge></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">{t("contractInfo.title") || "Contract Info"}</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">{t("contractInfo.network") || "Network"}:</span><Badge variant="outline" className="ml-2">Base Sepolia</Badge></div>
              <div><span className="text-muted-foreground">{t("contractInfo.verifier") || "Verifier"}:</span><div className="font-mono text-xs mt-1 break-all">{verifierAddress || "Not deployed"}</div></div>
              <div><span className="text-muted-foreground">{t("contractInfo.mixerContract") || "Mixer"}:</span><div className="font-mono text-xs mt-1 break-all">{mixerAddress || "Not deployed"}</div></div>
              {mixerAddress && (<a href={`https://sepolia.basescan.org/address/${mixerAddress}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full mt-2"><ExternalLink className="h-4 w-4 mr-2" />{t("contractInfo.viewOnBasescan") || "View on Basescan"}</Button></a>)}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
