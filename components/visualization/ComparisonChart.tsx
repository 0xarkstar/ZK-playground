"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

interface ComparisonData {
  categoryKey: string;
  snark: number;
  stark: number;
  label: string;
}

const comparisonDataConfig: ComparisonData[] = [
  { categoryKey: "proofSize", snark: 200, stark: 45000, label: "bytes" },
  { categoryKey: "verificationTime", snark: 10, stark: 100, label: "ms" },
  { categoryKey: "proverTime", snark: 10000, stark: 5000, label: "ms (relative)" },
  { categoryKey: "setupRequired", snark: 1, stark: 0, label: "yes/no" },
  { categoryKey: "quantumSafe", snark: 0, stark: 1, label: "yes/no" },
];

type ChartType = "bar" | "radar";

export function ComparisonChart() {
  const t = useTranslations("visualization.comparison");
  const tCategories = useTranslations("visualization.comparisonCategories");
  const barChartRef = useRef<SVGSVGElement>(null);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Create translated comparison data
  const comparisonData = comparisonDataConfig.map((d) => ({
    ...d,
    category: tCategories(d.categoryKey),
  }));

  useEffect(() => {
    if (!mounted || !barChartRef.current) return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 120, bottom: 60, left: 150 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 600 400`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const normalizedData = comparisonData.map((d) => ({
      ...d,
      snarkNorm: d.categoryKey === "setupRequired" || d.categoryKey === "quantumSafe"
        ? d.snark
        : Math.log10(d.snark + 1) / Math.log10(Math.max(d.snark, d.stark) + 1),
      starkNorm: d.categoryKey === "setupRequired" || d.categoryKey === "quantumSafe"
        ? d.stark
        : Math.log10(d.stark + 1) / Math.log10(Math.max(d.snark, d.stark) + 1),
    }));

    const y0 = d3
      .scaleBand()
      .domain(normalizedData.map((d) => d.category))
      .rangeRound([0, height])
      .paddingInner(0.2);

    const y1 = d3
      .scaleBand()
      .domain(["snark", "stark"])
      .rangeRound([0, y0.bandwidth()])
      .padding(0.1);

    const x = d3.scaleLinear().domain([0, 1]).rangeRound([0, width]);

    g.append("g")
      .selectAll("g")
      .data(normalizedData)
      .join("g")
      .attr("transform", (d) => `translate(0,${y0(d.category)})`)
      .selectAll("rect")
      .data((d) => [
        { key: "snark", value: d.snarkNorm, original: d.snark },
        { key: "stark", value: d.starkNorm, original: d.stark },
      ])
      .join("rect")
      .attr("y", (d) => y1(d.key) || 0)
      .attr("x", 0)
      .attr("height", y1.bandwidth())
      .attr("width", 0)
      .attr("fill", (d) => (d.key === "snark" ? "#3b82f6" : "#8b5cf6"))
      .attr("rx", 4)
      .transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr("width", (d) => x(d.value));

    g.append("g")
      .selectAll("text")
      .data(normalizedData)
      .join("g")
      .attr("transform", (d) => `translate(0,${y0(d.category)})`)
      .selectAll("text")
      .data((d) => [
        { key: "snark", value: d.snarkNorm, original: d.snark, label: d.label },
        { key: "stark", value: d.starkNorm, original: d.stark, label: d.label },
      ])
      .join("text")
      .attr("y", (d) => (y1(d.key) || 0) + y1.bandwidth() / 2)
      .attr("x", (d) => x(d.value) + 5)
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("fill", "currentColor")
      .attr("opacity", 0)
      .text((d) => {
        if (d.label === "yes/no") return d.original === 1 ? "Yes" : "No";
        return d.original.toLocaleString();
      })
      .transition()
      .duration(800)
      .delay((_, i) => i * 100 + 400)
      .attr("opacity", 1);

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y0))
      .selectAll("text")
      .attr("font-size", "12px");

    const legend = svg
      .append("g")
      .attr("transform", `translate(${width + margin.left + 20}, ${margin.top})`);

    const legendData = [
      { label: "zk-SNARK", color: "#3b82f6" },
      { label: "zk-STARK", color: "#8b5cf6" },
    ];

    legend
      .selectAll("g")
      .data(legendData)
      .join("g")
      .attr("transform", (_, i) => `translate(0, ${i * 25})`)
      .call((g) => {
        g.append("rect")
          .attr("width", 16)
          .attr("height", 16)
          .attr("rx", 4)
          .attr("fill", (d) => d.color);
        g.append("text")
          .attr("x", 24)
          .attr("y", 12)
          .attr("font-size", "12px")
          .attr("fill", "currentColor")
          .text((d) => d.label);
      });
  }, [mounted, chartType, comparisonData]);

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("chartTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            {t("loadingChart")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("chartTitle")}</CardTitle>
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
            <TabsList>
              <TabsTrigger value="bar">{t("barChart")}</TabsTrigger>
              <TabsTrigger value="radar" disabled>
                {t("radarChart")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg ref={barChartRef} className="w-full h-auto min-w-[500px]" />
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            {t("chartNote")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DetailedComparison() {
  const t = useTranslations("visualization.comparison");
  const tTable = useTranslations("visualization.comparisonTable");

  const comparisonKeys = [
    { key: "proofSize", winner: "snark" as const },
    { key: "verificationTime", winner: "snark" as const },
    { key: "proverTime", winner: "stark" as const },
    { key: "trustedSetup", winner: "stark" as const },
    { key: "quantumResistance", winner: "stark" as const },
    { key: "ecosystemMaturity", winner: "snark" as const },
  ];

  const comparisons = comparisonKeys.map(({ key, winner }) => ({
    aspect: tTable(`${key}.aspect`),
    snark: tTable(`${key}.snark`),
    stark: tTable(`${key}.stark`),
    winner,
    description: tTable(`${key}.description`),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("detailedComparison")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">{t("tableHeaders.aspect")}</th>
                <th className="text-center py-3 px-2 text-blue-600 dark:text-blue-400">
                  {t("tableHeaders.snark")}
                </th>
                <th className="text-center py-3 px-2 text-purple-600 dark:text-purple-400">
                  {t("tableHeaders.stark")}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => (
                <tr key={row.aspect} className="border-b last:border-0">
                  <td className="py-3 px-2">
                    <div className="font-medium">{row.aspect}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.description}
                    </div>
                  </td>
                  <td
                    className={`text-center py-3 px-2 ${
                      row.winner === "snark"
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : ""
                    }`}
                  >
                    {row.snark}
                  </td>
                  <td
                    className={`text-center py-3 px-2 ${
                      row.winner === "stark"
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : ""
                    }`}
                  >
                    {row.stark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
