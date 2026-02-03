"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Clock,
  Lock,
  Eye,
  EyeOff,
  User,
} from "lucide-react";
import { poseidonHash } from "@/lib/zk/poseidon";
import { useTranslations } from "next-intl";

interface ProofResult {
  verified: boolean;
  proofTime: number;
  ageThreshold: number;
}

export function AgeVerificationDemo() {
  const t = useTranslations("demo.ageVerification");
  const common = useTranslations("common");

  // State
  const [birthYear, setBirthYear] = useState(2000);
  const [birthMonth, setBirthMonth] = useState(6);
  const [birthDay, setBirthDay] = useState(15);
  const [ageThreshold, setAgeThreshold] = useState(18);
  const [showBirthdate, setShowBirthdate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [identityCommitment, setIdentityCommitment] = useState<string | null>(null);
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // Timer effect
  useEffect(() => {
    if (isGenerating || isVerifying) {
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
  }, [isGenerating, isVerifying]);

  // Generate identity commitment
  const generateCommitment = async () => {
    setIsGenerating(true);
    setProgress(0);
    setProofResult(null);

    try {
      setStep(t("steps.hashingBirthdate"));
      setProgress(30);
      await new Promise((r) => setTimeout(r, 300));

      // Hash birth date components
      const commitment = await poseidonHash([
        BigInt(birthYear),
        BigInt(birthMonth),
        BigInt(birthDay),
      ]);

      setStep(t("steps.creatingCommitment"));
      setProgress(70);
      await new Promise((r) => setTimeout(r, 300));

      const commitmentHex = "0x" + commitment.toString(16).padStart(64, "0");
      setIdentityCommitment(commitmentHex);

      setStep(t("steps.complete"));
      setProgress(100);
    } catch (err) {
      console.error("Commitment generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Verify age proof
  const verifyAgeProof = async () => {
    setIsVerifying(true);
    setProgress(0);
    setProofResult(null);

    const startTime = Date.now();

    try {
      setStep(t("steps.computingAge"));
      setProgress(20);
      await new Promise((r) => setTimeout(r, 300));

      // Verify identity commitment
      setStep(t("steps.verifyingIdentity"));
      setProgress(40);

      const recomputedCommitment = await poseidonHash([
        BigInt(birthYear),
        BigInt(birthMonth),
        BigInt(birthDay),
      ]);
      const commitmentHex = "0x" + recomputedCommitment.toString(16).padStart(64, "0");

      if (commitmentHex !== identityCommitment) {
        throw new Error("Identity mismatch");
      }

      setStep(t("steps.checkingThreshold"));
      setProgress(60);
      await new Promise((r) => setTimeout(r, 300));

      // Check age >= threshold
      const calculatedAge = currentYear - birthYear;
      const isAboveThreshold = calculatedAge >= ageThreshold;

      setStep(t("steps.generatingProof"));
      setProgress(80);
      await new Promise((r) => setTimeout(r, 400));

      setStep(isAboveThreshold ? t("steps.verified") : t("steps.failed"));
      setProgress(100);

      const proofTime = Date.now() - startTime;
      setProofResult({
        verified: isAboveThreshold,
        proofTime,
        ageThreshold,
      });
    } catch (err) {
      console.error("Verification failed:", err);
      setProofResult({
        verified: false,
        proofTime: Date.now() - startTime,
        ageThreshold,
      });
    } finally {
      setIsVerifying(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1: Enter Birth Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t("step1.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Birth Date Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t("step1.birthdateLabel")}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBirthdate(!showBirthdate)}
                >
                  {showBirthdate ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {showBirthdate ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">{t("step1.year")}</Label>
                    <Input
                      type="number"
                      min={1900}
                      max={currentYear}
                      value={birthYear}
                      onChange={(e) => setBirthYear(parseInt(e.target.value) || 2000)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("step1.month")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("step1.day")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={birthDay}
                      onChange={(e) => setBirthDay(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg flex items-center gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {t("step1.hiddenBirthdate")}
                  </span>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("step1.calculatedAge")}
                  </span>
                  <Badge variant="secondary" className="text-lg">
                    {age} {t("step1.years")}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Generate Commitment */}
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="generating"
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
                  <Button onClick={generateCommitment} className="w-full">
                    <User className="h-4 w-4 mr-2" />
                    {t("step1.generateButton")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Identity Commitment Display */}
            {identityCommitment && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{t("step1.commitmentCreated")}</span>
                </div>
                <code className="text-xs break-all block">
                  {identityCommitment.slice(0, 20)}...{identityCommitment.slice(-10)}
                </code>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Verify Age */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("step2.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Age Threshold Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t("step2.thresholdLabel")}</Label>
                <Badge variant="outline">{ageThreshold}+</Badge>
              </div>
              <Slider
                value={[ageThreshold]}
                onValueChange={([value]) => setAgeThreshold(value)}
                min={13}
                max={65}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>13</span>
                <span>18</span>
                <span>21</span>
                <span>35</span>
                <span>65</span>
              </div>
            </div>

            {/* Common Age Thresholds */}
            <div className="flex flex-wrap gap-2">
              {[13, 18, 21, 25].map((threshold) => (
                <Button
                  key={threshold}
                  variant={ageThreshold === threshold ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAgeThreshold(threshold)}
                >
                  {threshold}+
                </Button>
              ))}
            </div>

            {/* Verify Button */}
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
                    onClick={verifyAgeProof}
                    disabled={!identityCommitment}
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("step2.verifyButton")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result */}
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
                    ? t("result.verifiedDesc", { threshold: proofResult.ageThreshold })
                    : t("result.failedDesc", { threshold: proofResult.ageThreshold })}
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

      {/* What Gets Revealed */}
      <Card>
        <CardHeader>
          <CardTitle>{t("revealed.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t("revealed.public")}
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t("revealed.publicItems.threshold")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t("revealed.publicItems.result")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t("revealed.publicItems.commitment")}
                </li>
              </ul>
            </div>
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <h4 className="font-medium text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                {t("revealed.private")}
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-500" />
                  {t("revealed.privateItems.birthdate")}
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-500" />
                  {t("revealed.privateItems.exactAge")}
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-red-500" />
                  {t("revealed.privateItems.identity")}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>{t("useCases.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["alcohol", "content", "voting", "insurance"].map((useCase) => (
              <div
                key={useCase}
                className="p-4 bg-muted rounded-lg text-center"
              >
                <span className="text-2xl mb-2 block">
                  {useCase === "alcohol" && "🍺"}
                  {useCase === "content" && "🔞"}
                  {useCase === "voting" && "🗳️"}
                  {useCase === "insurance" && "📋"}
                </span>
                <h4 className="font-medium">
                  {t(`useCases.items.${useCase}.title`)}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {t(`useCases.items.${useCase}.description`)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
