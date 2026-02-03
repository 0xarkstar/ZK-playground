"use client";

import { Badge } from "@/components/ui/badge";
import { AgeVerificationDemo } from "@/components/demo/age-verification";
import { useTranslations } from "next-intl";

export default function AgeVerificationPage() {
  const t = useTranslations("demo.ageVerification");

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4">
          {t("badge")}
        </Badge>
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">
          {t("description")}
        </p>
      </div>

      <AgeVerificationDemo />
    </div>
  );
}
