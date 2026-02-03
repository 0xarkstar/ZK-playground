"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Shield, CheckCircle, XCircle, Loader2, Info, Award, Building } from "lucide-react";
import { poseidonHash, generateIdentitySecret } from "@/lib/zk/poseidon";
import { useTranslations } from "next-intl";

const CREDENTIAL_TYPES = {
  1: { name: "Bachelor's Degree", icon: "🎓" },
  2: { name: "Master's Degree", icon: "📜" },
  3: { name: "PhD", icon: "🏆" },
  4: { name: "Professional Cert", icon: "📋" },
};

const ISSUERS = {
  1: "MIT",
  2: "Stanford",
  3: "Harvard",
  4: "Generic University",
};

export function CredentialDemo() {
  const t = useTranslations("demo.credential");

  const [credentialType, setCredentialType] = useState(1);
  const [issuer, setIssuer] = useState(1);
  const [degreeLevel, setDegreeLevel] = useState(3);
  const [credential, setCredential] = useState<{
    hash: string;
    issuerKey: string;
  } | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [verifyMinLevel, setVerifyMinLevel] = useState(2);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean } | null>(null);

  const issueCredential = async () => {
    setIsIssuing(true);
    setProgress(0);

    try {
      setStep(t("steps.generatingCredential"));
      setProgress(25);
      await new Promise((r) => setTimeout(r, 300));

      const subjectId = generateIdentitySecret();
      const issueDate = BigInt(Math.floor(Date.now() / 1000));

      setStep(t("steps.computingHash"));
      setProgress(50);

      const credHash = await poseidonHash([
        subjectId,
        BigInt(credentialType),
        issueDate,
        BigInt(0), // no expiry
        BigInt(degreeLevel),
        BigInt(0), // field of study
      ]);

      setStep(t("steps.signingCredential"));
      setProgress(75);

      const issuerSecret = generateIdentitySecret();
      const issuerKey = await poseidonHash([credHash, issuerSecret]);

      setStep(t("steps.complete"));
      setProgress(100);

      setCredential({
        hash: "0x" + credHash.toString(16).padStart(64, "0"),
        issuerKey: "0x" + issuerKey.toString(16).padStart(64, "0"),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsIssuing(false);
    }
  };

  const verifyCredential = async () => {
    if (!credential) return;

    setIsVerifying(true);
    setProgress(0);
    setVerifyResult(null);

    try {
      setStep(t("steps.verifyingSignature"));
      setProgress(30);
      await new Promise((r) => setTimeout(r, 300));

      setStep(t("steps.checkingAttributes"));
      setProgress(60);
      await new Promise((r) => setTimeout(r, 300));

      setStep(t("steps.generatingProof"));
      setProgress(90);
      await new Promise((r) => setTimeout(r, 400));

      const verified = degreeLevel >= verifyMinLevel;

      setStep(verified ? t("steps.verified") : t("steps.failed"));
      setProgress(100);

      setVerifyResult({ verified });
    } catch (err) {
      console.error(err);
      setVerifyResult({ verified: false });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("intro.title")}</AlertTitle>
        <AlertDescription>{t("intro.description")}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Credential */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {t("issue.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">{t("issue.type")}</label>
                <Select value={String(credentialType)} onValueChange={(v) => setCredentialType(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CREDENTIAL_TYPES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.icon} {val.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">{t("issue.issuer")}</label>
                <Select value={String(issuer)} onValueChange={(v) => setIssuer(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ISSUERS).map(([key, name]) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">{t("issue.level")}</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <Button
                      key={level}
                      variant={degreeLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDegreeLevel(level)}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isIssuing ? (
                <motion.div key="issuing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /><span>{step}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </motion.div>
              ) : (
                <Button onClick={issueCredential} className="w-full">
                  <Award className="h-4 w-4 mr-2" />{t("issue.button")}
                </Button>
              )}
            </AnimatePresence>

            {credential && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500 inline mr-2" />
                <span className="text-sm font-medium">{t("issue.success")}</span>
                <div className="mt-2 text-xs">
                  <div className="text-muted-foreground">{t("issue.credentialHash")}</div>
                  <code className="block">{credential.hash.slice(0, 25)}...</code>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verify Credential */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("verify.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("verify.description")}</p>

            <div>
              <label className="text-sm text-muted-foreground">{t("verify.minLevel")}</label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Button
                    key={level}
                    variant={verifyMinLevel === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVerifyMinLevel(level)}
                  >
                    {level}+
                  </Button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isVerifying ? (
                <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /><span>{step}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </motion.div>
              ) : (
                <Button onClick={verifyCredential} disabled={!credential} className="w-full">
                  <Shield className="h-4 w-4 mr-2" />{t("verify.button")}
                </Button>
              )}
            </AnimatePresence>

            {verifyResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg ${verifyResult.verified ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}
              >
                <div className="flex items-center gap-2">
                  {verifyResult.verified ? (
                    <><CheckCircle className="h-5 w-5 text-green-500" /><span className="font-medium text-green-600">{t("verify.verified")}</span></>
                  ) : (
                    <><XCircle className="h-5 w-5 text-red-500" /><span className="font-medium text-red-600">{t("verify.failed")}</span></>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {verifyResult.verified ? t("verify.verifiedDesc") : t("verify.failedDesc")}
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Use Cases */}
      <Card>
        <CardHeader><CardTitle>{t("useCases.title")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <Building className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium">{t("useCases.hiring.title")}</h4>
              <p className="text-sm text-muted-foreground">{t("useCases.hiring.description")}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <GraduationCap className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium">{t("useCases.education.title")}</h4>
              <p className="text-sm text-muted-foreground">{t("useCases.education.description")}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <Award className="h-5 w-5 text-primary mb-2" />
              <h4 className="font-medium">{t("useCases.licensing.title")}</h4>
              <p className="text-sm text-muted-foreground">{t("useCases.licensing.description")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
