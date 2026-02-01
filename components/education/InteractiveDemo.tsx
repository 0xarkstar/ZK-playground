"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface DemoStep {
  id: string;
  title: string;
  description: string;
  highlight?: string;
}

interface InteractiveDemoProps {
  title: string;
  description: string;
  steps: DemoStep[];
  onComplete?: () => void;
}

export function InteractiveDemo({
  title,
  description,
  steps,
}: InteractiveDemoProps) {
  const t = useTranslations("education.interactive");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handlePlay = () => {
    if (completed) {
      setCurrentStep(0);
      setCompleted(false);
    }
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setCompleted(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={currentStep === 0 && !isPlaying}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={isPlaying ? handleNext : handlePlay}
              disabled={completed}
            >
              {isPlaying ? (
                t("buttons.next")
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  {t("buttons.start")}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`h-2 flex-1 rounded-full transition-colors ${
                completed || i < currentStep
                  ? "bg-green-500"
                  : i === currentStep && isPlaying
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-8"
            >
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h4 className="font-semibold text-lg">{t("complete")}</h4>
              <p className="text-muted-foreground">
                {t("completeDesc")}
              </p>
            </motion.div>
          ) : isPlaying ? (
            <motion.div
              key={steps[currentStep].id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 bg-muted rounded-lg"
            >
              <Badge className="mb-2">{t("step")} {currentStep + 1}</Badge>
              <h4 className="font-semibold text-lg mb-2">
                {steps[currentStep].title}
              </h4>
              <p className="text-muted-foreground">
                {steps[currentStep].description}
              </p>
              {steps[currentStep].highlight && (
                <div className="mt-4 p-3 bg-background rounded border font-mono text-sm">
                  {steps[currentStep].highlight}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              {t("startPrompt")}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

interface SimpleProofDemoProps {
  title?: string;
}

export function SimpleProofDemo({ title }: SimpleProofDemoProps) {
  const t = useTranslations("education.interactive.simpleProof");
  const [secret, setSecret] = useState(3);
  const [publicValue, setPublicValue] = useState(9);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const handleVerify = () => {
    setIsVerifying(true);
    setResult(null);

    setTimeout(() => {
      const isValid = secret * secret === publicValue;
      setResult(isValid);
      setIsVerifying(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title || t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">{t("secretLabel")}</label>
            <input
              type="number"
              value={secret}
              onChange={(e) => setSecret(parseInt(e.target.value) || 0)}
              className="w-full mt-1 p-2 border rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("secretHint")}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">{t("publicLabel")}</label>
            <input
              type="number"
              value={publicValue}
              onChange={(e) => setPublicValue(parseInt(e.target.value) || 0)}
              className="w-full mt-1 p-2 border rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("publicHint")}
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg font-mono text-sm">
          <div className="text-muted-foreground">{t("claim")}:</div>
          <div>{t("claimTemplate", { value: publicValue })}</div>
        </div>

        <Button onClick={handleVerify} disabled={isVerifying} className="w-full">
          {isVerifying ? t("verifying") : t("generateVerify")}
        </Button>

        <AnimatePresence>
          {result !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-lg flex items-center gap-3 ${
                result
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {result ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  <span>{t("proofVerified")}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  <span>{t("proofFailed")}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
