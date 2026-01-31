"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Loader2,
  CheckCircle,
  FileCode,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { generateProof, exportSolidityCalldata, parseCalldata } from "@/lib/zk/snarkjs";
import { MerkleTree } from "@/lib/zk/merkle";
import { poseidonHashTwo } from "@/lib/zk/poseidon";
import { CIRCUIT_WASM_PATH, CIRCUIT_ZKEY_PATH, TREE_DEPTH } from "@/lib/web3/contracts";
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

interface ProofGeneratorProps {
  vote: number | null;
  identity: VoterIdentity | null;
  merkleRoot: bigint | null;
  externalNullifier: bigint;
  commitments: bigint[];
  onProofGenerated: (proof: ProofData) => void;
  isEnabled: boolean;
}

export function ProofGenerator({
  vote,
  identity,
  merkleRoot,
  externalNullifier,
  commitments,
  onProofGenerated,
  isEnabled,
}: ProofGeneratorProps) {
  const t = useTranslations("demo.proofGenerator");
  const common = useTranslations("common");

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed time counter
  useEffect(() => {
    if (isGenerating) {
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
  }, [isGenerating]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const generateZKProof = async () => {
    if (vote === null || !identity || !merkleRoot) return;

    setIsGenerating(true);
    setProgress(0);
    setProofData(null);
    setError(null);

    try {
      // Step 1: Build Merkle tree and get proof
      setStep(t("steps.buildingTree"));
      setProgress(10);

      const tree = new MerkleTree(TREE_DEPTH);
      await tree.initialize();
      await tree.insertMany(commitments);

      setStep(t("steps.generatingMerkle"));
      setProgress(20);

      const merkleProof = await tree.getProof(identity.leafIndex);

      // Step 2: Compute nullifier hash
      setStep(t("steps.computingNullifier"));
      setProgress(30);

      const nullifierHash = await poseidonHashTwo(identity.secret, externalNullifier);

      // Step 3: Prepare circuit inputs
      setStep(t("steps.preparingInputs"));
      setProgress(40);

      const circuitInput = {
        // Private inputs
        identitySecret: identity.secret.toString(),
        pathElements: merkleProof.pathElements.map(e => e.toString()),
        pathIndices: merkleProof.pathIndices.map(i => i.toString()),
        // Public inputs
        merkleRoot: merkleRoot.toString(),
        nullifierHash: nullifierHash.toString(),
        vote: vote.toString(),
        externalNullifier: externalNullifier.toString(),
      };

      // Step 4: Generate proof using snarkjs
      setStep(t("steps.generatingProof"));
      setProgress(50);

      const { proof, publicSignals } = await generateProof(
        circuitInput,
        CIRCUIT_WASM_PATH,
        CIRCUIT_ZKEY_PATH,
        (p, msg) => {
          setProgress(50 + (p * 0.4));
          setStep(msg);
        }
      );

      // Step 5: Format proof for Solidity
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
      onProofGenerated(proofResult);
    } catch (err) {
      console.error("Proof generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!identity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            {t("registerFirst")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {vote === null ? (
          <div className="text-center py-6 text-muted-foreground">
            {t("selectVoteFirst")}
          </div>
        ) : proofData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{t("proofGenerated")}</span>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("yourVote")}</span>
                <Badge variant={vote === 1 ? "default" : "secondary"}>
                  {vote === 1 ? common("yes") : common("no")}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("nullifier")}</span>
                <span className="font-mono text-xs">
                  {proofData.nullifierHash.slice(0, 10)}...
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  {t("hideDetails")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  {t("showDetails")}
                </>
              )}
            </Button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 bg-background border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileCode className="h-4 w-4" />
                      <span className="text-sm font-medium">{t("proofData")}</span>
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
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm mb-2">
                <span className="text-muted-foreground">{t("selectedVote")} </span>
                <Badge variant={vote === 1 ? "default" : "secondary"}>
                  {vote === 1 ? common("yes") : common("no")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("proofDescription")}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
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
                    <span className="text-sm flex-1">{step}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("estimatedTime")}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    onClick={generateZKProof}
                    disabled={!isEnabled}
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("generateButton")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
