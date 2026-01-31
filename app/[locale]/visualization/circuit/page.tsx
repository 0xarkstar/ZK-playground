"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircuitGraph } from "@/components/visualization/CircuitGraph";
import { Code } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CircuitVisualizationPage() {
  const t = useTranslations("visualization");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          {t("module")}
        </Badge>
        <h1 className="text-3xl font-bold mb-2">{t("circuit.title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("circuit.description")}
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {t("circuit.interactiveGraph")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {t("circuit.graphDescription")}
            </p>
            <CircuitGraph />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("circuit.understandingSignals")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                {t("circuit.signalsDescription")}
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <h4 className="font-semibold text-green-700 dark:text-green-300">
                    {t("circuit.inputSignals")}
                  </h4>
                  <p className="text-muted-foreground">
                    {t("circuit.inputSignalsDesc")}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                    {t("circuit.outputSignals")}
                  </h4>
                  <p className="text-muted-foreground">
                    {t("circuit.outputSignalsDesc")}
                  </p>
                </div>
                <div className="p-3 bg-gray-500/10 rounded-lg">
                  <h4 className="font-semibold">{t("circuit.intermediateSignals")}</h4>
                  <p className="text-muted-foreground">
                    {t("circuit.intermediateSignalsDesc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("circuit.constraintsTemplates")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                {t("circuit.constraintsTemplatesDesc")}
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                    {t("circuit.constraints")}
                  </h4>
                  <p className="text-muted-foreground">
                    {t("circuit.constraintsDesc")}
                  </p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-300">
                    {t("circuit.templates")}
                  </h4>
                  <p className="text-muted-foreground">
                    {t("circuit.templatesDesc")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("circuit.codeExamples")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{t("circuit.multiplier")}</h4>
                <pre className="text-xs overflow-x-auto">
                  {`template Multiplier() {
  signal input a;
  signal input b;
  signal output c;

  c <== a * b;
}`}
                </pre>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{t("circuit.binaryCheck")}</h4>
                <pre className="text-xs overflow-x-auto">
                  {`template Binary() {
  signal input b;

  // b must be 0 or 1
  b * (b - 1) === 0;
}`}
                </pre>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">{t("circuit.usingTemplate")}</h4>
                <pre className="text-xs overflow-x-auto">
                  {`template Main() {
  signal input x;

  component hash = Poseidon(1);
  hash.inputs[0] <== x;

  signal output out;
  out <== hash.out;
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
