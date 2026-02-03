"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  CheckCircle,
  Loader2,
  ExternalLink,
  Copy,
  FileCode,
} from "lucide-react";
import { useWalletClient, usePublicClient } from "wagmi";
import { useTranslations } from "next-intl";
import { ErrorDisplay } from "./ErrorDisplay";
import { Abi } from "viem";

export interface DemoContractConfig {
  name: string;
  verifierAbi: Abi;
  verifierBytecode: `0x${string}`;
  appAbi: Abi;
  appBytecode: `0x${string}`;
  verifierLabel?: string;
  appLabel?: string;
}

interface GenericContractDeployerProps {
  config: DemoContractConfig;
  onDeployed: (verifierAddress: string, appAddress: string) => void;
  isDeployed: boolean;
  verifierAddress: string | null;
  appAddress: string | null;
}

export function GenericContractDeployer({
  config,
  onDeployed,
  isDeployed,
  verifierAddress,
  appAddress,
}: GenericContractDeployerProps) {
  const t = useTranslations("demo.contractDeployer");
  const tErrors = useTranslations("demo.errors");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isDeploying, setIsDeploying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const deployContracts = async () => {
    if (!walletClient || !publicClient) {
      setError(tErrors("walletNotConnected"));
      return;
    }

    setIsDeploying(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Deploy Verifier
      setStep(t("steps.deployingVerifier"));
      setProgress(20);

      const verifierHash = await walletClient.deployContract({
        abi: config.verifierAbi,
        bytecode: config.verifierBytecode,
      });

      setStep(t("steps.waitingVerifier"));
      setProgress(40);

      const verifierReceipt = await publicClient.waitForTransactionReceipt({
        hash: verifierHash,
      });

      const verifierAddr = verifierReceipt.contractAddress;
      if (!verifierAddr) throw new Error("Failed to get verifier address");

      // Step 2: Deploy App Contract
      setStep(t("steps.deployingVoting").replace("Voting", config.name));
      setProgress(60);

      const appHash = await walletClient.deployContract({
        abi: config.appAbi,
        bytecode: config.appBytecode,
        args: [verifierAddr],
      });

      setStep(t("steps.waitingVoting").replace("Voting", config.name));
      setProgress(80);

      const appReceipt = await publicClient.waitForTransactionReceipt({
        hash: appHash,
      });

      const appAddr = appReceipt.contractAddress;
      if (!appAddr) throw new Error("Failed to get app contract address");

      setStep(t("steps.complete"));
      setProgress(100);

      onDeployed(verifierAddr, appAddr);
    } catch (err) {
      console.error("Deployment error:", err);
      setError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  const copyAddress = (address: string, type: string) => {
    navigator.clipboard.writeText(address);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const basescanUrl = (address: string) =>
    `https://sepolia.basescan.org/address/${address}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDeployed && verifierAddress && appAddress ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{t("deployed")}</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    {config.verifierLabel || t("groth16Verifier")}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyAddress(verifierAddress, "verifier")}
                    >
                      {copied === "verifier" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <a
                      href={basescanUrl(verifierAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="font-mono text-xs break-all">{verifierAddress}</div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    {config.appLabel || config.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyAddress(appAddress, "app")}
                    >
                      {copied === "app" ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <a
                      href={basescanUrl(appAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm" className="h-6 px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="font-mono text-xs break-all">{appAddress}</div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {t("ownerNote")}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("description")}
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>
                <strong>{config.verifierLabel || t("groth16Verifier")}</strong> - {t("groth16Desc")}
              </li>
              <li>
                <strong>{config.appLabel || config.name}</strong> - Application contract
              </li>
            </ul>

            {error && (
              <ErrorDisplay error={error} onRetry={deployContracts} />
            )}

            <AnimatePresence mode="wait">
              {isDeploying ? (
                <motion.div
                  key="deploying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{step}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("confirmInWallet")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    onClick={deployContracts}
                    className="w-full"
                    disabled={!walletClient}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    {t("deployButton")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-3 bg-yellow-500/10 rounded-lg text-xs text-muted-foreground">
              <strong className="text-yellow-600 dark:text-yellow-400">
                {t("requiresEth")}
              </strong>{" "}
              - {t("getFreeEth")}{" "}
              <a
                href="https://docs.base.org/base-chain/tools/network-faucets"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Base Faucet
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
