"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Vote,
  ThumbsUp,
  ThumbsDown,
  Send,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useWalletClient, usePublicClient } from "wagmi";
import { SECRET_VOTING_ABI } from "@/lib/web3/contracts";
import { useTranslations } from "next-intl";
import { ConfirmVoteDialog } from "./ConfirmVoteDialog";
import { ErrorDisplay } from "./ErrorDisplay";

interface ProofData {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
  nullifierHash: string;
}

interface VotingPanelProps {
  selectedVote: number | null;
  onVoteSelect: (vote: number) => void;
  proof: ProofData | null;
  onVoteSubmitted: (txHash: string) => void;
  hasVoted: boolean;
  txHash: string | null;
  votingContract: `0x${string}` | null;
}

export function VotingPanel({
  selectedVote,
  onVoteSelect,
  proof,
  onVoteSubmitted,
  hasVoted,
  txHash,
  votingContract,
}: VotingPanelProps) {
  const t = useTranslations("demo.votingPanel");
  const common = useTranslations("common");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmitClick = () => {
    setShowConfirmDialog(true);
  };

  const submitVote = async () => {
    if (!walletClient || !publicClient || !votingContract || !proof || selectedVote === null) {
      return;
    }

    setShowConfirmDialog(false);
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert proof components to proper format
      const pA: readonly [bigint, bigint] = [BigInt(proof.pA[0]), BigInt(proof.pA[1])];
      const pB: readonly [readonly [bigint, bigint], readonly [bigint, bigint]] = [
        [BigInt(proof.pB[0][0]), BigInt(proof.pB[0][1])],
        [BigInt(proof.pB[1][0]), BigInt(proof.pB[1][1])],
      ];
      const pC: readonly [bigint, bigint] = [BigInt(proof.pC[0]), BigInt(proof.pC[1])];

      const hash = await walletClient.writeContract({
        address: votingContract,
        abi: SECRET_VOTING_ABI,
        functionName: "castVote",
        args: [pA, pB, pC, BigInt(proof.nullifierHash), BigInt(selectedVote)],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      onVoteSubmitted(hash);
    } catch (err) {
      console.error("Vote submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasVoted && txHash ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">{t("voteRecorded")}</span>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg text-sm space-y-2">
                <p className="text-green-700 dark:text-green-300">
                  {t("voteSuccess")}
                </p>
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline"
                >
                  {t("viewTransaction")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-medium mb-3">
                  {t("question")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={selectedVote === 1 ? "default" : "outline"}
                      className="w-full h-24 flex flex-col gap-2"
                      onClick={() => onVoteSelect(1)}
                      aria-label={`${t("question")} - ${common("yes")}`}
                      aria-pressed={selectedVote === 1}
                    >
                      <ThumbsUp
                        className={`h-8 w-8 ${
                          selectedVote === 1
                            ? "text-primary-foreground"
                            : "text-green-500"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-semibold">{common("yes")}</span>
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={selectedVote === 0 ? "default" : "outline"}
                      className="w-full h-24 flex flex-col gap-2"
                      onClick={() => onVoteSelect(0)}
                      aria-label={`${t("question")} - ${common("no")}`}
                      aria-pressed={selectedVote === 0}
                    >
                      <ThumbsDown
                        className={`h-8 w-8 ${
                          selectedVote === 0
                            ? "text-primary-foreground"
                            : "text-red-500"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-semibold">{common("no")}</span>
                    </Button>
                  </motion.div>
                </div>
              </div>

              {selectedVote !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("yourSelection")}</span>
                      <Badge variant={selectedVote === 1 ? "default" : "secondary"}>
                        {selectedVote === 1 ? common("yes") : common("no")}
                      </Badge>
                    </div>
                  </div>

                  {error && (
                    <ErrorDisplay
                      error={error}
                      onRetry={handleSubmitClick}
                    />
                  )}

                  {proof && !error && (
                    <Button
                      className="w-full"
                      onClick={handleSubmitClick}
                      disabled={isSubmitting || !walletClient}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("submitting")}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {t("submitVote")}
                        </>
                      )}
                    </Button>
                  )}
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmVoteDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedVote={selectedVote}
        onConfirm={submitVote}
      />
    </>
  );
}

interface VotingResultsProps {
  results: { yes: number; no: number };
}

export function VotingResults({ results }: VotingResultsProps) {
  const common = useTranslations("common");
  const total = results.yes + results.no;
  const yesPercent = total > 0 ? (results.yes / total) * 100 : 50;
  const noPercent = total > 0 ? (results.no / total) * 100 : 50;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-green-500" />
            <span>{common("yes")}</span>
          </div>
          <span className="font-medium">
            {results.yes} {common("votes")} ({yesPercent.toFixed(1)}%)
          </span>
        </div>
        <Progress value={yesPercent} className="h-3 bg-muted" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ThumbsDown className="h-4 w-4 text-red-500" />
            <span>{common("no")}</span>
          </div>
          <span className="font-medium">
            {results.no} {common("votes")} ({noPercent.toFixed(1)}%)
          </span>
        </div>
        <Progress value={noPercent} className="h-3 bg-muted" />
      </div>

      <div className="text-center text-sm text-muted-foreground pt-2">
        {common("totalVotes")}: {total}
      </div>
    </div>
  );
}
