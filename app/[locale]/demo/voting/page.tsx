"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractDeployer } from "@/components/demo/ContractDeployer";
import { VoterRegistration } from "@/components/demo/VoterRegistration";
import { ProofGenerator } from "@/components/demo/ProofGenerator";
import { VotingPanel, VotingResults } from "@/components/demo/VotingPanel";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletBalance, FaucetLink } from "@/components/demo/WalletBalance";
import { MerkleTree } from "@/lib/zk/merkle";
import { SECRET_VOTING_ABI, TREE_DEPTH } from "@/lib/web3/contracts";
import {
  Wallet,
  CheckCircle2,
  Info,
  ExternalLink,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface VoterIdentity {
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

export default function VotingDemoPage() {
  const t = useTranslations("demo.voting");
  const common = useTranslations("common");
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Contract state
  const [verifierAddress, setVerifierAddress] = useState<string | null>(null);
  const [votingAddress, setVotingAddress] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Voting state
  const [votingActive, setVotingActive] = useState(false);
  const [merkleRoot, setMerkleRoot] = useState<bigint | null>(null);
  const [externalNullifier, setExternalNullifier] = useState<bigint>(BigInt(Date.now()));
  const [commitments, setCommitments] = useState<bigint[]>([]);

  // User state
  const [identity, setIdentity] = useState<VoterIdentity | null>(null);
  const [selectedVote, setSelectedVote] = useState<number | null>(null);
  const [proof, setProof] = useState<ProofData | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Results
  const [results, setResults] = useState({ yes: 0, no: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const votingContract = votingAddress as `0x${string}` | null;

  // Fetch contract state
  const refreshContractState = useCallback(async () => {
    if (!publicClient || !votingContract) return;

    setIsRefreshing(true);
    try {
      const [active, root, nullifier, owner, commitmentsData, yesVotes, noVotes] = await Promise.all([
        publicClient.readContract({
          address: votingContract,
          abi: SECRET_VOTING_ABI,
          functionName: "votingActive",
        }),
        publicClient.readContract({
          address: votingContract,
          abi: SECRET_VOTING_ABI,
          functionName: "merkleRoot",
        }),
        publicClient.readContract({
          address: votingContract,
          abi: SECRET_VOTING_ABI,
          functionName: "externalNullifier",
        }),
        publicClient.readContract({
          address: votingContract,
          abi: SECRET_VOTING_ABI,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: votingContract,
          abi: SECRET_VOTING_ABI,
          functionName: "getCommitments",
        }),
        publicClient.readContract({
          address: votingContract,
          abi: SECRET_VOTING_ABI,
          functionName: "yesVotes",
        }),
        publicClient.readContract({
          address: votingContract,
          abi: SECRET_VOTING_ABI,
          functionName: "noVotes",
        }),
      ]);

      setVotingActive(active as boolean);
      setMerkleRoot(root as bigint);
      setExternalNullifier((nullifier as bigint) || BigInt(Date.now()));
      setIsOwner(address?.toLowerCase() === (owner as string)?.toLowerCase());
      setCommitments((commitmentsData as `0x${string}`[]).map(c => BigInt(c)));
      setResults({
        yes: Number(yesVotes as bigint),
        no: Number(noVotes as bigint),
      });
    } catch (err) {
      console.error("Failed to refresh contract state:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicClient, votingContract, address]);

  useEffect(() => {
    if (votingContract) {
      refreshContractState();
    }
  }, [votingContract, refreshContractState]);

  // Handle contract deployment
  const handleDeployed = (verifier: string, voting: string) => {
    setVerifierAddress(verifier);
    setVotingAddress(voting);
    setIsOwner(true);
  };

  // Handle voter registration
  const handleRegister = (newIdentity: VoterIdentity) => {
    setIdentity(newIdentity);
    setCommitments(prev => [...prev, newIdentity.commitment]);
  };

  // Handle proof generated
  const handleProofGenerated = (newProof: ProofData) => {
    setProof(newProof);
  };

  // Handle vote submitted
  const handleVoteSubmitted = (hash: string) => {
    setTxHash(hash);
    setHasVoted(true);
    refreshContractState();
  };

  // Start voting (admin only)
  const startVoting = async () => {
    if (!walletClient || !publicClient || !votingContract || commitments.length === 0) return;

    try {
      // Build Merkle tree
      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();
      await tree.insertMany(commitments);
      const root = tree.getRoot();

      const newNullifier = BigInt(Date.now());
      const rootBytes = ("0x" + root.toString(16).padStart(64, "0")) as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: votingContract,
        abi: SECRET_VOTING_ABI,
        functionName: "startVoting",
        args: [rootBytes, newNullifier],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setMerkleRoot(root);
      setExternalNullifier(newNullifier);
      setVotingActive(true);
    } catch (err) {
      console.error("Failed to start voting:", err);
    }
  };

  // End voting (admin only)
  const endVoting = async () => {
    if (!walletClient || !publicClient || !votingContract) return;

    try {
      const hash = await walletClient.writeContract({
        address: votingContract,
        abi: SECRET_VOTING_ABI,
        functionName: "endVoting",
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setVotingActive(false);
      refreshContractState();
    } catch (err) {
      console.error("Failed to end voting:", err);
    }
  };

  const currentStep = !votingAddress
    ? 0
    : !identity
    ? 1
    : !votingActive
    ? 2
    : !proof
    ? 3
    : !hasVoted
    ? 4
    : 5;

  const progressSteps = [
    { step: 0, name: t("progress.deployContracts") },
    { step: 1, name: t("progress.registerIdentity") },
    { step: 2, name: t("progress.startVoting") },
    { step: 3, name: t("progress.generateProof") },
    { step: 4, name: t("progress.submitVote") },
    { step: 5, name: t("progress.complete") },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: t("howItWorks.steps.step1.title"),
      desc: t("howItWorks.steps.step1.description"),
    },
    {
      step: 2,
      title: t("howItWorks.steps.step2.title"),
      desc: t("howItWorks.steps.step2.description"),
    },
    {
      step: 3,
      title: t("howItWorks.steps.step3.title"),
      desc: t("howItWorks.steps.step3.description"),
    },
    {
      step: 4,
      title: t("howItWorks.steps.step4.title"),
      desc: t("howItWorks.steps.step4.description"),
    },
    {
      step: 5,
      title: t("howItWorks.steps.step5.title"),
      desc: t("howItWorks.steps.step5.description"),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          {t("badge")}
        </Badge>
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("description")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{t("realBlockchainAlert.title")}</AlertTitle>
            <AlertDescription>
              {t("realBlockchainAlert.description")}{" "}
              <FaucetLink />.
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

          <Tabs defaultValue="vote" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="vote">{t("tabs.vote")}</TabsTrigger>
              <TabsTrigger value="how">{t("tabs.howItWorks")}</TabsTrigger>
            </TabsList>

            <TabsContent value="vote" className="space-y-4">
              {/* Contract Deployment */}
              <ContractDeployer
                onDeployed={handleDeployed}
                isDeployed={!!votingAddress}
                verifierAddress={verifierAddress}
                votingAddress={votingAddress}
              />

              {/* Admin Controls */}
              {votingAddress && isOwner && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{t("adminControls.title")}</span>
                      <Badge variant="outline">{t("adminControls.owner")}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{t("adminControls.votingStatus")}</div>
                        <div className="text-sm text-muted-foreground">
                          {votingActive ? t("adminControls.votingActive") : t("adminControls.votingNotActive")}
                        </div>
                      </div>
                      <Badge variant={votingActive ? "default" : "secondary"}>
                        {votingActive ? t("adminControls.active") : t("adminControls.inactive")}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      {!votingActive ? (
                        <Button
                          onClick={startVoting}
                          disabled={commitments.length === 0}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {t("adminControls.startVoting")}
                        </Button>
                      ) : (
                        <Button onClick={endVoting} variant="destructive" className="flex-1">
                          <Square className="h-4 w-4 mr-2" />
                          {t("adminControls.endVoting")}
                        </Button>
                      )}
                    </div>

                    {commitments.length === 0 && !votingActive && (
                      <p className="text-xs text-muted-foreground">
                        {t("adminControls.registerVoterFirst")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Voter Registration & Proof Generation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VoterRegistration
                  onRegister={handleRegister}
                  isRegistered={!!identity}
                  identity={identity}
                  votingContract={votingContract}
                  isContractDeployed={!!votingAddress}
                />
                <ProofGenerator
                  vote={selectedVote}
                  identity={identity}
                  merkleRoot={merkleRoot}
                  externalNullifier={externalNullifier}
                  commitments={commitments}
                  onProofGenerated={handleProofGenerated}
                  isEnabled={!!identity && selectedVote !== null && votingActive && !!merkleRoot}
                />
              </div>

              {/* Voting Panel */}
              <VotingPanel
                selectedVote={selectedVote}
                onVoteSelect={setSelectedVote}
                proof={proof}
                onVoteSubmitted={handleVoteSubmitted}
                hasVoted={hasVoted}
                txHash={txHash}
                votingContract={votingContract}
              />
            </TabsContent>

            <TabsContent value="how" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("howItWorks.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">{t("howItWorks.privacyProblem.title")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("howItWorks.privacyProblem.description")}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-semibold">{t("howItWorks.zkSolution.title")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("howItWorks.zkSolution.description")}
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold">{t("howItWorks.steps.title")}</h4>
                    <div className="space-y-3">
                      {howItWorksSteps.map((item) => (
                        <div key={item.step} className="flex gap-3">
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {item.step}
                          </div>
                          <div>
                            <h5 className="font-medium text-sm">{item.title}</h5>
                            <p className="text-xs text-muted-foreground">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
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
                <span>{t("results.title")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshContractState}
                  disabled={!votingAddress || isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VotingResults results={results} />
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
                <span className="text-muted-foreground">{t("contractInfo.votingContract")}:</span>
                <div className="font-mono text-xs mt-1 break-all">
                  {votingAddress || t("contractInfo.notDeployed")}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">{t("contractInfo.registeredVoters")}:</span>
                <Badge variant="secondary" className="ml-2">
                  {commitments.length}
                </Badge>
              </div>
              {votingAddress && (
                <a
                  href={`https://sepolia.basescan.org/address/${votingAddress}`}
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
