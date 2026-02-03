"use client";

import { Badge } from "@/components/ui/badge";
import { Radio } from "lucide-react";
import { useTranslations } from "next-intl";

export function LiveBadge() {
  const t = useTranslations("common");

  return (
    <Badge variant="default" className="bg-green-600 hover:bg-green-600 gap-1">
      <Radio className="h-3 w-3" />
      {t("liveMode")}
    </Badge>
  );
}
