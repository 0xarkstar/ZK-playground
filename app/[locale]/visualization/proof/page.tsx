"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ProofAnimation,
  ProofStats,
} from "@/components/visualization/ProofAnimation";
import { SimpleProofDemo } from "@/components/education/InteractiveDemo";
import { ArrowRight, FileInput, FileOutput, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProofVisualizationPage() {
  const t = useTranslations("visualization");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          {t("module")}
        </Badge>
        <h1 className="text-3xl font-bold mb-2">{t("proof.title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("proof.description")}
        </p>
      </div>

      <div className="space-y-8">
        <ProofStats />

        <ProofAnimation />

        <Card>
          <CardHeader>
            <CardTitle>{t("proof.proofFlow")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4">
              <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg flex-1">
                <FileInput className="h-8 w-8 mb-2 text-green-500" />
                <h4 className="font-semibold">{t("proof.inputs")}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("proof.publicPrivate")}
                </p>
              </div>

              <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />

              <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg flex-1">
                <Lock className="h-8 w-8 mb-2 text-purple-500" />
                <h4 className="font-semibold">{t("proof.zkProof")}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("proof.cryptographicMagic")}
                </p>
              </div>

              <ArrowRight className="h-6 w-6 text-muted-foreground hidden md:block" />

              <div className="flex flex-col items-center text-center p-4 bg-muted rounded-lg flex-1">
                <FileOutput className="h-8 w-8 mb-2 text-blue-500" />
                <h4 className="font-semibold">{t("proof.output")}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("proof.proofPublicSignals")}
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">{t("proof.whatGetsRevealed")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h5 className="font-medium text-green-600 dark:text-green-400">
                    {t("proof.visibleToVerifier")}
                  </h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>- {t("proof.visibleItems.publicInputs")}</li>
                    <li>- {t("proof.visibleItems.proofItself")}</li>
                    <li>- {t("proof.visibleItems.verificationResult")}</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h5 className="font-medium text-red-600 dark:text-red-400">
                    {t("proof.hiddenFromVerifier")}
                  </h5>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>- {t("proof.hiddenItems.privateInputs")}</li>
                    <li>- {t("proof.hiddenItems.intermediateValues")}</li>
                    <li>- {t("proof.hiddenItems.secrets")}</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("proof.proofComponents")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">{t("proof.piA")}</h4>
                <p className="text-muted-foreground">
                  {t("proof.piADesc")}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">{t("proof.piB")}</h4>
                <p className="text-muted-foreground">
                  {t("proof.piBDesc")}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">{t("proof.piC")}</h4>
                <p className="text-muted-foreground">
                  {t("proof.piCDesc")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("proof.verificationEquation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("proof.verificationDescription")}
              </p>
              <div className="p-4 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
                <pre>{`e(A, B) = e(α, β) · e(L, γ) · e(C, δ)

Where:
- e() is the bilinear pairing
- A, B, C are proof elements
- α, β, γ, δ are verification key
- L is computed from public inputs`}</pre>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("proof.verificationExplanation")}
              </p>
            </CardContent>
          </Card>
        </div>

        <SimpleProofDemo title={t("proof.tryItYourself")} />
      </div>
    </div>
  );
}
