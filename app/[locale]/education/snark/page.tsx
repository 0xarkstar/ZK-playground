"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConceptCard, StepCard } from "@/components/education/ConceptCard";
import { SimpleProofDemo } from "@/components/education/InteractiveDemo";
import {
  Lock,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle,
  Code,
  Calculator,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function SnarkEducationPage() {
  const t = useTranslations("education.snark");
  const common = useTranslations("education");

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          {common("module")}
        </Badge>
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("subtitle")}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
          <TabsTrigger value="how-it-works">{t("tabs.howItWorks")}</TabsTrigger>
          <TabsTrigger value="trusted-setup">{t("tabs.trustedSetup")}</TabsTrigger>
          <TabsTrigger value="try-it">{t("tabs.tryIt")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("overview.whatIs")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{t("overview.description")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Lock className="h-4 w-4" />
                    {t("overview.properties.zeroKnowledge.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.zeroKnowledge.description")}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4" />
                    {t("overview.properties.succinct.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.succinct.description")}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    {t("overview.properties.nonInteractive.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.nonInteractive.description")}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    {t("overview.properties.argumentOfKnowledge.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.argumentOfKnowledge.description")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConceptCard
              title={t("overview.advantages.title")}
              description={t("overview.advantages.description")}
              icon={CheckCircle}
            >
              <ul className="space-y-2 text-sm">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">+</span>
                    <span>{t(`overview.advantages.items.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </ConceptCard>

            <ConceptCard
              title={t("overview.limitations.title")}
              description={t("overview.limitations.description")}
              icon={AlertTriangle}
            >
              <ul className="space-y-2 text-sm">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">!</span>
                    <span>{t(`overview.limitations.items.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </ConceptCard>
          </div>
        </TabsContent>

        <TabsContent value="how-it-works" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {t("howItWorks.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground">
                {t("howItWorks.description")}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <StepCard
              step={1}
              title={t("howItWorks.steps.circuit.title")}
              description={t("howItWorks.steps.circuit.description")}
              details={[
                t("howItWorks.steps.circuit.details.0"),
                t("howItWorks.steps.circuit.details.1"),
                t("howItWorks.steps.circuit.details.2"),
              ]}
            />
            <StepCard
              step={2}
              title={t("howItWorks.steps.r1cs.title")}
              description={t("howItWorks.steps.r1cs.description")}
              details={[
                t("howItWorks.steps.r1cs.details.0"),
                t("howItWorks.steps.r1cs.details.1"),
                t("howItWorks.steps.r1cs.details.2"),
              ]}
            />
            <StepCard
              step={3}
              title={t("howItWorks.steps.qap.title")}
              description={t("howItWorks.steps.qap.description")}
              details={[
                t("howItWorks.steps.qap.details.0"),
                t("howItWorks.steps.qap.details.1"),
                t("howItWorks.steps.qap.details.2"),
              ]}
            />
            <StepCard
              step={4}
              title={t("howItWorks.steps.proof.title")}
              description={t("howItWorks.steps.proof.description")}
              details={[
                t("howItWorks.steps.proof.details.0"),
                t("howItWorks.steps.proof.details.1"),
                t("howItWorks.steps.proof.details.2"),
              ]}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t("howItWorks.example.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 font-mono text-sm">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-muted-foreground mb-2">{t("howItWorks.example.circuit")}</div>
                  <pre>{`signal private input x;
signal output y;
y <== x * x;`}</pre>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-muted-foreground mb-2">{t("howItWorks.example.r1cs")}</div>
                  <pre>{`x * x = y
// With x=3, y=9: 3 * 3 = 9 ✓`}</pre>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-muted-foreground mb-2">{t("howItWorks.example.whatGetsProven")}</div>
                  <pre>{`"I know a secret x such that x*x = 9"
// Verifier only sees: y=9, proof
// Verifier does NOT see: x=3`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trusted-setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                {t("trustedSetup.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{t("trustedSetup.description")}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">{t("trustedSetup.whatHappens.title")}</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i}>- {t(`trustedSetup.whatHappens.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 border rounded-lg border-yellow-500/50 bg-yellow-500/5">
                  <h4 className="font-semibold mb-2 text-yellow-600 dark:text-yellow-400">
                    {t("trustedSetup.toxicWaste.title")}
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i}>- {t(`trustedSetup.toxicWaste.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("trustedSetup.powersOfTau.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t("trustedSetup.powersOfTau.description")}
              </p>
              <div className="space-y-4">
                <StepCard
                  step={1}
                  title={t("trustedSetup.powersOfTau.phase1.title")}
                  description={t("trustedSetup.powersOfTau.phase1.description")}
                />
                <StepCard
                  step={2}
                  title={t("trustedSetup.powersOfTau.secureDestruction.title")}
                  description={t("trustedSetup.powersOfTau.secureDestruction.description")}
                />
                <StepCard
                  step={3}
                  title={t("trustedSetup.powersOfTau.phase2.title")}
                  description={t("trustedSetup.powersOfTau.phase2.description")}
                />
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg mt-4">
                <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                  {t("trustedSetup.powersOfTau.securityGuarantee.title")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("trustedSetup.powersOfTau.securityGuarantee.description")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="try-it" className="space-y-6">
          <SimpleProofDemo title={t("tryIt.title")} />

          <Card>
            <CardHeader>
              <CardTitle>{t("tryIt.whatJustHappened")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t("tryIt.description")}
              </p>
              <ul className="space-y-2 text-sm">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>{t(`tryIt.realFeatures.${i}`)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
