"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  WalletCards,
  Wifi,
  XCircle,
} from "lucide-react";

type ErrorType = "insufficientFunds" | "userRejected" | "network" | "unknown";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

function getErrorType(error: string): ErrorType {
  const lowerError = error.toLowerCase();
  if (
    lowerError.includes("insufficient") ||
    lowerError.includes("funds") ||
    lowerError.includes("balance")
  ) {
    return "insufficientFunds";
  }
  if (
    lowerError.includes("rejected") ||
    lowerError.includes("denied") ||
    lowerError.includes("user")
  ) {
    return "userRejected";
  }
  if (
    lowerError.includes("network") ||
    lowerError.includes("connection") ||
    lowerError.includes("timeout")
  ) {
    return "network";
  }
  return "unknown";
}

function getErrorIcon(errorType: ErrorType) {
  switch (errorType) {
    case "insufficientFunds":
      return WalletCards;
    case "userRejected":
      return XCircle;
    case "network":
      return Wifi;
    default:
      return AlertTriangle;
  }
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  const t = useTranslations("demo.errorDisplay");
  const [showDetails, setShowDetails] = useState(false);

  const errorType = getErrorType(error);
  const Icon = getErrorIcon(errorType);

  return (
    <Alert variant="destructive" className="relative">
      <Icon className="h-4 w-4" />
      <AlertTitle>{t(`errors.${errorType}.title`)}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{t(`errors.${errorType}.description`)}</p>

        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium">
            {t(`errors.${errorType}.action`)}
          </p>

          {errorType === "insufficientFunds" && (
            <a
              href="https://docs.base.org/base-chain/tools/network-faucets"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline hover:no-underline"
            >
              Base Faucet
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t("retry")}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                {t("hideDetails")}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                {t("showDetails")}
              </>
            )}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-3 p-2 bg-background/50 rounded text-xs font-mono break-all">
            {error}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
