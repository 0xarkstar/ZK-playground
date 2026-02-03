"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash,
  Eye,
  EyeOff,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { poseidonHashSingle } from "@/lib/zk/poseidon";
import { useTranslations } from "next-intl";

interface ProofResult {
  verified: boolean;
  hash: string;
  proofTime: number;
}

export function HashPreimageDemo() {
  const t = useTranslations("demo.hashPreimage");
  const common = useTranslations("common");

  // State
  const [secret, setSecret] = useState("");
  const [computedHash, setComputedHash] = useState<string | null>(null);
  const [verificationHash, setVerificationHash] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isComputing || isVerifying) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 100);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isComputing, isVerifying]);

  // Compute hash of secret
  const computeHash = async () => {
    if (!secret.trim()) return;

    setIsComputing(true);
    setProgress(0);
    setProofResult(null);

    try {
      setStep(t("steps.convertingToField"));
      setProgress(20);
      await new Promise((r) => setTimeout(r, 300));

      // Convert string to field element (simplified - use hash of string)
      const secretBytes = new TextEncoder().encode(secret);
      let secretNum = BigInt(0);
      for (let i = 0; i < Math.min(secretBytes.length, 31); i++) {
        secretNum = (secretNum << BigInt(8)) + BigInt(secretBytes[i]);
      }

      setStep(t("steps.computingPoseidon"));
      setProgress(50);

      const hash = await poseidonHashSingle(secretNum);

      setStep(t("steps.formattingHash"));
      setProgress(80);
      await new Promise((r) => setTimeout(r, 200));

      const hashHex = "0x" + hash.toString(16).padStart(64, "0");
      setComputedHash(hashHex);
      setVerificationHash(hashHex);

      setStep(t("steps.complete"));
      setProgress(100);
    } catch (err) {
      console.error("Hash computation failed:", err);
    } finally {
      setIsComputing(false);
    }
  };

  // Verify proof (simulate ZK verification)
  const verifyProof = async () => {
    if (!secret.trim() || !verificationHash) return;

    setIsVerifying(true);
    setProgress(0);
    setProofResult(null);

    const startTime = Date.now();

    try {
      setStep(t("steps.generatingWitness"));
      setProgress(20);
      await new Promise((r) => setTimeout(r, 300));

      // Convert secret to field element
      const secretBytes = new TextEncoder().encode(secret);
      let secretNum = BigInt(0);
      for (let i = 0; i < Math.min(secretBytes.length, 31); i++) {
        secretNum = (secretNum << BigInt(8)) + BigInt(secretBytes[i]);
      }

      setStep(t("steps.computingProof"));
      setProgress(50);
      await new Promise((r) => setTimeout(r, 500));

      // Compute hash
      const hash = await poseidonHashSingle(secretNum);
      const hashHex = "0x" + hash.toString(16).padStart(64, "0");

      setStep(t("steps.verifyingProof"));
      setProgress(80);
      await new Promise((r) => setTimeout(r, 300));

      // Check if hash matches
      const verified = hashHex.toLowerCase() === verificationHash.toLowerCase();

      setStep(verified ? t("steps.verified") : t("steps.failed"));
      setProgress(100);

      const proofTime = Date.now() - startTime;
      setProofResult({
        verified,
        hash: hashHex,
        proofTime,
      });
    } catch (err) {
      console.error("Verification failed:", err);
      setProofResult({
        verified: false,
        hash: "",
        proofTime: Date.now() - startTime,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const copyHash = () => {
    if (computedHash) {
      navigator.clipboard.writeText(computedHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("intro.title")}</AlertTitle>
        <AlertDescription>{t("intro.description")}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Create Commitment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              {t("step1.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret">{t("step1.secretLabel")}</Label>
              <div className="relative">
                <Input
                  id="secret"
                  type={showSecret ? "text" : "password"}
                  placeholder={t("step1.secretPlaceholder")}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("step1.secretHint")}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {isComputing ? (
                <motion.div
                  key="computing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{step}</span>
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
                  <Button
                    onClick={computeHash}
                    disabled={!secret.trim()}
                    className="w-full"
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    {t("step1.computeButton")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {computedHash && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-muted rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("step1.hashResult")}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyHash}
                    className="h-8"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <code className="text-xs break-all block">{computedHash}</code>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Verify Proof */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("step2.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verifyHash">{t("step2.hashLabel")}</Label>
              <Input
                id="verifyHash"
                placeholder={t("step2.hashPlaceholder")}
                value={verificationHash}
                onChange={(e) => setVerificationHash(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {t("step2.hashHint")}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {isVerifying ? (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{step}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(elapsedTime)}
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
                    onClick={verifyProof}
                    disabled={!secret.trim() || !verificationHash}
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("step2.verifyButton")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {proofResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg ${
                  proofResult.verified
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {proofResult.verified ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {t("result.verified")}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {t("result.failed")}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {proofResult.verified
                    ? t("result.verifiedDesc")
                    : t("result.failedDesc")}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t("result.proofTime")}: {formatTime(proofResult.proofTime)}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>{t("howItWorks.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="font-medium">{t("howItWorks.step1.title")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step1.description")}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="font-medium">{t("howItWorks.step2.title")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step2.description")}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="font-medium">{t("howItWorks.step3.title")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("howItWorks.step3.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Guarantee */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-medium mb-1">{t("privacy.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("privacy.description")}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">{t("privacy.tags.zeroKnowledge")}</Badge>
                <Badge variant="secondary">{t("privacy.tags.poseidonHash")}</Badge>
                <Badge variant="secondary">{t("privacy.tags.noSecretLeaked")}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
