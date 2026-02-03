"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function CircuitReadyBadge() {
  const t = useTranslations("common");

  return (
    <Badge variant="outline" className="border-green-500/50 text-green-600 gap-1">
      <CheckCircle className="h-3 w-3" />
      {t("circuitReady")}
    </Badge>
  );
}
