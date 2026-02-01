"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Key,
  CheckCircle,
  Copy,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useWalletClient, usePublicClient } from "wagmi";
import { SECRET_VOTING_ABI } from "@/lib/web3/contracts";
import { poseidonHash } from "@/lib/zk/poseidon";
import { useTranslations } from "next-intl";
import { ErrorDisplay } from "./ErrorDisplay";

interface VoterIdentity {
  secret: bigint;
  commitment: bigint;
  leafIndex: number;
}

interface VoterRegistrationProps {
  onRegister: (identity: VoterIdentity) => void;
  isRegistered: boolean;
  identity: VoterIdentity | null;
  votingContract: `0x${string}` | null;
  isContractDeployed: boolean;
}

export function VoterRegistration({
  onRegister,
  isRegistered,
  identity,
  votingContract,
  isContractDeployed,
}: VoterRegistrationProps) {
  const t = useTranslations("demo.voterRegistration");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tErrors = useTranslations("demo.errors");

  const handleRegister = async () => {
    if (!walletClient || !publicClient || !votingContract) {
      setError(tErrors("walletOrContractNotReady"));
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Generate random secret
      setStep(t("steps.generatingSecret"));
      setProgress(20);

      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const secret = BigInt("0x" + Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join(""));

      // Step 2: Compute identity commitment using Poseidon hash
      setStep(t("steps.computingCommitment"));
      setProgress(40);

      const commitment = await poseidonHash([secret]);

      // Step 3: Get current voter count (this will be our leaf index)
      setStep(t("steps.gettingCount"));
      setProgress(50);

      const voterCount = await publicClient.readContract({
        address: votingContract,
        abi: SECRET_VOTING_ABI,
        functionName: "voterCount",
      }) as bigint;

      // Step 4: Register on-chain
      setStep(t("steps.registering"));
      setProgress(60);

      // Convert commitment to bytes32
      const commitmentBytes32 = ("0x" + commitment.toString(16).padStart(64, "0")) as `0x${string}`;

      const hash = await walletClient.writeContract({
        address: votingContract,
        abi: SECRET_VOTING_ABI,
        functionName: "registerVoter",
        args: [commitmentBytes32],
      });

      setStep(t("steps.waitingConfirmation"));
      setProgress(80);

      await publicClient.waitForTransactionReceipt({ hash });

      setStep(t("steps.complete"));
      setProgress(100);

      const newIdentity: VoterIdentity = {
        secret,
        commitment,
        leafIndex: Number(voterCount),
      };

      onRegister(newIdentity);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const copySecret = () => {
    if (identity) {
      navigator.clipboard.writeText(identity.secret.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBigInt = (value: bigint) => {
    const hex = value.toString(16).padStart(64, "0");
    return "0x" + hex.slice(0, 8) + "..." + hex.slice(-8);
  };

  if (!isContractDeployed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            {t("deployFirst")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRegistered && identity ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{t("registered")}</span>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{t("identitySecret")}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copySecret}
                    className="h-6 px-2"
                  >
                    {copied ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="font-mono text-xs break-all bg-background p-2 rounded border">
                  {formatBigInt(identity.secret)}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">{t("identityCommitment")}</span>
                <div className="font-mono text-xs break-all bg-background p-2 rounded border mt-1">
                  {formatBigInt(identity.commitment)}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("merkleLeafIndex")}</span>
                <Badge variant="secondary">{identity.leafIndex}</Badge>
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 rounded-lg flex gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <strong className="text-yellow-600 dark:text-yellow-400">
                  {t("keepSecretSafe")}
                </strong>{" "}
                {t("keepSecretSafeDesc")}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>

            {error && (
              <ErrorDisplay error={error} onRetry={handleRegister} />
            )}

            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{step}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </motion.div>
              ) : (
                <motion.div
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button onClick={handleRegister} className="w-full" disabled={!walletClient}>
                    <Key className="h-4 w-4 mr-2" />
                    {t("generateButton")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t("createsItems.title")}</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>{t("createsItems.secret")}</li>
                <li>{t("createsItems.commitment")}</li>
                <li>{t("createsItems.position")}</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
