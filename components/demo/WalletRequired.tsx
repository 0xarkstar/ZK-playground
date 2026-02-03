"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { WalletBalance, FaucetLink } from "./WalletBalance";

interface WalletRequiredProps {
  children: React.ReactNode;
}

export function WalletRequired({ children }: WalletRequiredProps) {
  const { isConnected } = useAccount();
  const t = useTranslations("common");

  if (!isConnected) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t("walletRequired")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t("walletRequiredDescription")}
          </p>
          <ConnectButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("testnetAlert")}</AlertTitle>
        <AlertDescription>
          {t("testnetAlertDescription")} <FaucetLink />
        </AlertDescription>
      </Alert>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            {t("connectedWallet")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WalletBalance />
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
