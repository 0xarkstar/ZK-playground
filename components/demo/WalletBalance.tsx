"use client";

import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fuel, AlertTriangle, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

const FAUCET_URL = "https://docs.base.org/base-chain/tools/network-faucets";
const LOW_BALANCE_THRESHOLD = 0.001;

export function WalletBalance() {
  const t = useTranslations("demo.walletBalance");
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading } = useBalance({ address });

  if (!isConnected) return null;

  const balanceValue = balance ? parseFloat(formatEther(balance.value)) : 0;
  const isLowBalance = balanceValue < LOW_BALANCE_THRESHOLD;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Fuel className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("balance")}:</span>
        <Badge variant={isLowBalance ? "destructive" : "secondary"}>
          {isLoading ? "..." : `${balanceValue.toFixed(6)} ETH`}
        </Badge>
      </div>

      {!isLoading && isLowBalance && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("insufficientBalance")}</AlertTitle>
          <AlertDescription>
            <p>{t("needEth")}</p>
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
                {t("getTestnetEth")} <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function FaucetLink() {
  return (
    <a
      href={FAUCET_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Base Faucet
    </a>
  );
}
