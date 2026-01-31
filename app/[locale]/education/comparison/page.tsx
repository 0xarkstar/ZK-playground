"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ComparisonChart,
  DetailedComparison,
} from "@/components/visualization/ComparisonChart";
import { CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ComparisonPage() {
  const t = useTranslations("education.comparison");
  const common = useTranslations("education");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          {common("module")}
        </Badge>
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("subtitle")}
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("quickOverview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border rounded-lg bg-blue-500/5 border-blue-500/20">
                <h3 className="font-bold text-xl text-blue-600 dark:text-blue-400 mb-2">
                  zk-SNARK
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("snarkDesc")}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t("features.tinyProof")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t("features.fastVerification")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t("features.matureEcosystem")}
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {t("features.trustedSetup")}
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {t("features.notQuantumResistant")}
                  </li>
                </ul>
              </div>

              <div className="p-6 border rounded-lg bg-purple-500/5 border-purple-500/20">
                <h3 className="font-bold text-xl text-purple-600 dark:text-purple-400 mb-2">
                  zk-STARK
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("starkDesc")}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t("features.noTrustedSetup")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t("features.quantumResistant")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t("features.scalesBetter")}
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {t("features.largerProof")}
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {t("features.slowerVerification")}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <ComparisonChart />

        <DetailedComparison />

        <Card>
          <CardHeader>
            <CardTitle>{t("useCases.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500" />
                  {t("useCases.bestForSnarks")}
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.snarks.onChain.title")}</strong>
                    <br />
                    {t("useCases.snarks.onChain.description")}
                  </li>
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.snarks.privacy.title")}</strong>
                    <br />
                    {t("useCases.snarks.privacy.description")}
                  </li>
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.snarks.identity.title")}</strong>
                    <br />
                    {t("useCases.snarks.identity.description")}
                  </li>
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.snarks.tooling.title")}</strong>
                    <br />
                    {t("useCases.snarks.tooling.description")}
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-purple-500" />
                  {t("useCases.bestForStarks")}
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.starks.l2.title")}</strong>
                    <br />
                    {t("useCases.starks.l2.description")}
                  </li>
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.starks.large.title")}</strong>
                    <br />
                    {t("useCases.starks.large.description")}
                  </li>
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.starks.longTerm.title")}</strong>
                    <br />
                    {t("useCases.starks.longTerm.description")}
                  </li>
                  <li className="p-3 bg-muted rounded-lg">
                    <strong className="text-foreground">{t("useCases.starks.noTrust.title")}</strong>
                    <br />
                    {t("useCases.starks.noTrust.description")}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("future.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t("future.description")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">{t("future.starkSnarkWrapping.title")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("future.starkSnarkWrapping.description")}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">{t("future.universalSnarks.title")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("future.universalSnarks.description")}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">{t("future.recursiveProofs.title")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("future.recursiveProofs.description")}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg mt-4">
              <h4 className="font-semibold mb-1">{t("future.bottomLine.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("future.bottomLine.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
