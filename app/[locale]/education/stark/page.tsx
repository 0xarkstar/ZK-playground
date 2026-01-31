"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConceptCard, StepCard } from "@/components/education/ConceptCard";
import {
  Shield,
  Zap,
  Eye,
  CheckCircle,
  AlertTriangle,
  Code,
  Layers,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function StarkEducationPage() {
  const t = useTranslations("education.stark");
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
          <TabsTrigger value="transparency">{t("tabs.transparency")}</TabsTrigger>
          <TabsTrigger value="applications">{t("tabs.applications")}</TabsTrigger>
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
                    <Zap className="h-4 w-4" />
                    {t("overview.properties.scalable.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.scalable.description")}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4" />
                    {t("overview.properties.transparent.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.transparent.description")}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    {t("overview.properties.quantumResistant.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.quantumResistant.description")}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4" />
                    {t("overview.properties.minimalAssumptions.title")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("overview.properties.minimalAssumptions.description")}
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
              title={t("overview.tradeoffs.title")}
              description={t("overview.tradeoffs.description")}
              icon={AlertTriangle}
            >
              <ul className="space-y-2 text-sm">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">!</span>
                    <span>{t(`overview.tradeoffs.items.${i}`)}</span>
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
              title={t("howItWorks.steps.air.title")}
              description={t("howItWorks.steps.air.description")}
              details={[
                t("howItWorks.steps.air.details.0"),
                t("howItWorks.steps.air.details.1"),
                t("howItWorks.steps.air.details.2"),
              ]}
            />
            <StepCard
              step={2}
              title={t("howItWorks.steps.polynomial.title")}
              description={t("howItWorks.steps.polynomial.description")}
              details={[
                t("howItWorks.steps.polynomial.details.0"),
                t("howItWorks.steps.polynomial.details.1"),
                t("howItWorks.steps.polynomial.details.2"),
              ]}
            />
            <StepCard
              step={3}
              title={t("howItWorks.steps.fri.title")}
              description={t("howItWorks.steps.fri.description")}
              details={[
                t("howItWorks.steps.fri.details.0"),
                t("howItWorks.steps.fri.details.1"),
                t("howItWorks.steps.fri.details.2"),
              ]}
            />
            <StepCard
              step={4}
              title={t("howItWorks.steps.fiatShamir.title")}
              description={t("howItWorks.steps.fiatShamir.description")}
              details={[
                t("howItWorks.steps.fiatShamir.details.0"),
                t("howItWorks.steps.fiatShamir.details.1"),
                t("howItWorks.steps.fiatShamir.details.2"),
              ]}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                {t("howItWorks.example.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {t("howItWorks.example.description")}
                </p>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground mb-2">{t("howItWorks.example.executionTrace")}</div>
                  <pre>{`Step | a    | b
-----|------|------
  0  |  1   |  1
  1  |  1   |  2
  2  |  2   |  3
  3  |  3   |  5
 ... | ...  | ...
 99  | F_99 | F_100`}</pre>
                </div>
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground mb-2">{t("howItWorks.example.constraints")}</div>
                  <pre>{`// For each row i (except last):
a[i+1] = b[i]
b[i+1] = a[i] + b[i]

// Boundary constraints:
a[0] = 1
b[0] = 1`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transparency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-500" />
                {t("transparency.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{t("transparency.description")}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 border rounded-lg border-green-500/50 bg-green-500/5">
                  <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">
                    {t("transparency.howItWorks.title")}
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i}>- {t(`transparency.howItWorks.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">{t("transparency.comparisonToSnarks.title")}</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i}>- {t(`transparency.comparisonToSnarks.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("transparency.postQuantum.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t("transparency.postQuantum.description")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">{t("transparency.postQuantum.starkBasis.title")}</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {[0, 1, 2].map((i) => (
                      <li key={i}>- {t(`transparency.postQuantum.starkBasis.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">{t("transparency.postQuantum.snarkVulnerability.title")}</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {[0, 1, 2].map((i) => (
                      <li key={i}>- {t(`transparency.postQuantum.snarkVulnerability.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg mt-4">
                <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  {t("transparency.postQuantum.futureProofing.title")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("transparency.postQuantum.futureProofing.description")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("applications.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {t("applications.description")}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConceptCard
              title={t("applications.projects.starknet.title")}
              description={t("applications.projects.starknet.description")}
              badges={["L2 Scaling", "Cairo", "Ethereum"]}
            >
              <ul className="text-sm space-y-1 text-muted-foreground">
                {[0, 1, 2].map((i) => (
                  <li key={i}>- {t(`applications.projects.starknet.features.${i}`)}</li>
                ))}
              </ul>
            </ConceptCard>

            <ConceptCard
              title={t("applications.projects.starkex.title")}
              description={t("applications.projects.starkex.description")}
              badges={["dYdX", "Immutable X", "Sorare"]}
            >
              <ul className="text-sm space-y-1 text-muted-foreground">
                {[0, 1, 2].map((i) => (
                  <li key={i}>- {t(`applications.projects.starkex.features.${i}`)}</li>
                ))}
              </ul>
            </ConceptCard>

            <ConceptCard
              title={t("applications.projects.miden.title")}
              description={t("applications.projects.miden.description")}
              badges={["Polygon", "Privacy", "Rollup"]}
            >
              <ul className="text-sm space-y-1 text-muted-foreground">
                {[0, 1, 2].map((i) => (
                  <li key={i}>- {t(`applications.projects.miden.features.${i}`)}</li>
                ))}
              </ul>
            </ConceptCard>

            <ConceptCard
              title={t("applications.projects.riscZero.title")}
              description={t("applications.projects.riscZero.description")}
              badges={["zkVM", "RISC-V", "Bonsai"]}
            >
              <ul className="text-sm space-y-1 text-muted-foreground">
                {[0, 1, 2].map((i) => (
                  <li key={i}>- {t(`applications.projects.riscZero.features.${i}`)}</li>
                ))}
              </ul>
            </ConceptCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("applications.whenToUse.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">{t("applications.whenToUse.starks.title")}</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i}>- {t(`applications.whenToUse.starks.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">{t("applications.whenToUse.snarks.title")}</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i}>- {t(`applications.whenToUse.snarks.items.${i}`)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
