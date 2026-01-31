"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Clock,
  FileCode,
  Key,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface ProofStep {
  id: string;
  nameKey: string;
  descriptionKey: string;
  duration: number;
  icon: React.ReactNode;
  details: string[];
}

const proofStepsConfig: Omit<ProofStep, "details">[] = [
  {
    id: "input",
    nameKey: "steps.input.name",
    descriptionKey: "steps.input.description",
    duration: 500,
    icon: <FileCode className="h-5 w-5" />,
  },
  {
    id: "witness",
    nameKey: "steps.witness.name",
    descriptionKey: "steps.witness.description",
    duration: 1500,
    icon: <Clock className="h-5 w-5" />,
  },
  {
    id: "proof",
    nameKey: "steps.proof.name",
    descriptionKey: "steps.proof.description",
    duration: 3000,
    icon: <Key className="h-5 w-5" />,
  },
  {
    id: "verify",
    nameKey: "steps.verify.name",
    descriptionKey: "steps.verify.description",
    duration: 1000,
    icon: <ShieldCheck className="h-5 w-5" />,
  },
];

export function ProofAnimation() {
  const t = useTranslations("visualization.proof");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepProgress, setStepProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isPlaying || currentStep >= proofStepsConfig.length) return;

    if (currentStep === -1) {
      setCurrentStep(0);
      return;
    }

    const step = proofStepsConfig[currentStep];
    const interval = 50;
    const increment = (interval / step.duration) * 100;

    const timer = setInterval(() => {
      setStepProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          if (currentStep < proofStepsConfig.length - 1) {
            setTimeout(() => {
              setCurrentStep(currentStep + 1);
              setStepProgress(0);
            }, 200);
          } else {
            setIsComplete(true);
            setIsPlaying(false);
          }
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, currentStep]);

  const handlePlay = () => {
    if (isComplete) {
      handleReset();
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(-1);
    setStepProgress(0);
    setIsComplete(false);
  };

  const getStepStatus = (index: number) => {
    if (index < currentStep) return "complete";
    if (index === currentStep) return "active";
    return "pending";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("pipelineTitle")}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={currentStep === -1 && !isComplete}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={isPlaying ? handlePause : handlePlay}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  {t("buttons.pause")}
                </>
              ) : isComplete ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {t("buttons.restart")}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  {currentStep > -1 ? t("buttons.resume") : t("buttons.start")}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {proofStepsConfig.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0.5 }}
                animate={{
                  opacity: status === "pending" ? 0.5 : 1,
                }}
                className="relative"
              >
                <div className="flex gap-4">
                  <div className="relative">
                    <motion.div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === "complete"
                          ? "bg-green-500 text-white"
                          : status === "active"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                      animate={
                        status === "active"
                          ? { scale: [1, 1.1, 1] }
                          : { scale: 1 }
                      }
                      transition={{ repeat: status === "active" ? Infinity : 0, duration: 1 }}
                    >
                      {status === "complete" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : status === "active" ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </motion.div>
                    {index < proofStepsConfig.length - 1 && (
                      <div
                        className={`absolute left-1/2 top-10 w-0.5 h-16 -translate-x-1/2 ${
                          status === "complete" ? "bg-green-500" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{t(step.nameKey)}</h4>
                      {status === "complete" && (
                        <Badge variant="secondary" className="text-green-600 bg-green-500/10">
                          {t("status.complete")}
                        </Badge>
                      )}
                      {status === "active" && (
                        <Badge variant="secondary" className="text-primary">
                          {t("status.inProgress")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t(step.descriptionKey)}
                    </p>

                    <AnimatePresence>
                      {status === "active" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <Progress value={stepProgress} className="h-2" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-green-500/10 rounded-lg text-center"
              >
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="font-semibold text-lg text-green-700 dark:text-green-300 mb-2">
                  {t("proofVerified.title")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("proofVerified.description")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProofStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">~200</div>
          <div className="text-sm text-muted-foreground">Proof Size (bytes)</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">~10ms</div>
          <div className="text-sm text-muted-foreground">Verification Time</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">~30s</div>
          <div className="text-sm text-muted-foreground">Proof Generation</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">4</div>
          <div className="text-sm text-muted-foreground">Public Signals</div>
        </CardContent>
      </Card>
    </div>
  );
}
