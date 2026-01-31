"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Eye,
  Vote,
  Shield,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");

  const features = [
    {
      title: t("features.education.title"),
      description: t("features.education.description"),
      icon: BookOpen,
      href: "/education/snark",
      badges: ["zk-SNARK", "zk-STARK", "R1CS", "FRI"],
    },
    {
      title: t("features.circuitViz.title"),
      description: t("features.circuitViz.description"),
      icon: Eye,
      href: "/visualization/circuit",
      badges: ["React Flow", "Circom", "Interactive"],
    },
    {
      title: t("features.proofAnimation.title"),
      description: t("features.proofAnimation.description"),
      icon: Zap,
      href: "/visualization/proof",
      badges: ["Witness", "Proof", "Verification"],
    },
    {
      title: t("features.votingDemo.title"),
      description: t("features.votingDemo.description"),
      icon: Vote,
      href: "/demo/voting",
      badges: ["Live Demo", "Base Sepolia", "Wagmi"],
    },
  ];

  const concepts = [
    {
      title: t("concepts.zeroKnowledge.title"),
      description: t("concepts.zeroKnowledge.description"),
      icon: Lock,
    },
    {
      title: t("concepts.succinctness.title"),
      description: t("concepts.succinctness.description"),
      icon: Zap,
    },
    {
      title: t("concepts.privacy.title"),
      description: t("concepts.privacy.description"),
      icon: Shield,
    },
  ];

  const techStack = [
    { name: "Circom", desc: t("techStack.circom") },
    { name: "snarkjs", desc: t("techStack.snarkjs") },
    { name: "circomlib", desc: t("techStack.circomlib") },
    { name: "Groth16", desc: t("techStack.groth16") },
    { name: "Next.js", desc: t("techStack.nextjs") },
    { name: "wagmi", desc: t("techStack.wagmi") },
    { name: "React Flow", desc: t("techStack.reactFlow") },
    { name: "Base Sepolia", desc: t("techStack.baseSepolia") },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="flex flex-col items-center text-center space-y-8">
          <Badge variant="secondary" className="text-sm">
            {t("badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl">
            {t("title")}{" "}
            <span className="text-primary bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            {t("description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/education/snark">
              <Button size="lg" className="gap-2">
                {t("startLearning")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo/voting">
              <Button size="lg" variant="outline" className="gap-2">
                {t("tryDemo")}
                <Vote className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Core Concepts */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {concepts.map((concept) => (
            <Card key={concept.title} className="text-center">
              <CardHeader>
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <concept.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{concept.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{concept.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{t("whatYouWillLearn")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("whatYouWillLearnDesc")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="h-full transition-colors hover:border-primary cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                  <CardDescription className="text-base mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {feature.badges.map((badge) => (
                      <Badge key={badge} variant="outline">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="container mx-auto px-4 py-12 md:py-20 border-t">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{t("builtWithModernStack")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("builtWithModernStackDesc")}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {techStack.map((tech) => (
            <div
              key={tech.name}
              className="flex items-center gap-2 p-4 rounded-lg border bg-card"
            >
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{tech.name}</p>
                <p className="text-xs text-muted-foreground">{tech.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="flex flex-col items-center text-center py-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {t("readyToExplore")}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg">
              {t("readyToExploreDesc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/education/snark">
                <Button size="lg">
                  {t("beginWithSnark")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
