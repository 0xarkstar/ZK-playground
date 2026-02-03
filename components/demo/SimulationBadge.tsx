"use client";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface SimulationBadgeProps {
  showAlert?: boolean;
}

export function SimulationBadge({ showAlert = false }: SimulationBadgeProps) {
  const t = useTranslations("common");

  if (showAlert) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <FlaskConical className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm">
          <span className="font-medium text-amber-600">{t("simulationMode")}</span>
          {" - "}
          {t("simulationModeDescription")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Badge variant="outline" className="border-amber-500/50 text-amber-600 gap-1">
      <FlaskConical className="h-3 w-3" />
      {t("simulationMode")}
    </Badge>
  );
}
