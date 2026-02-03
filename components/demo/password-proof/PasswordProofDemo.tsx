"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  Clock,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Database,
  Send,
} from "lucide-react";
import { poseidonHash, generateIdentitySecret } from "@/lib/zk/poseidon";
import { useTranslations } from "next-intl";

interface StoredCredential {
  salt: bigint;
  passwordHash: string;
}

interface ProofResult {
  verified: boolean;
  proofTime: number;
}

export function PasswordProofDemo() {
  const t = useTranslations("demo.passwordProof");
  const common = useTranslations("common");

  // Registration state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [storedCredential, setStoredCredential] = useState<StoredCredential | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Login state
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Progress state
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [proofResult, setProofResult] = useState<ProofResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (isRegistering || isAuthenticating) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 100);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRegistering, isAuthenticating]);

  // Convert password string to field element
  const passwordToField = (pwd: string): bigint => {
    const bytes = new TextEncoder().encode(pwd);
    let num = BigInt(0);
    for (let i = 0; i < Math.min(bytes.length, 31); i++) {
      num = (num << BigInt(8)) + BigInt(bytes[i]);
    }
    return num;
  };

  // Register password
  const registerPassword = async () => {
    if (!password.trim()) return;

    setIsRegistering(true);
    setProgress(0);
    setProofResult(null);

    try {
      setStep(t("steps.generatingSalt"));
      setProgress(20);
      await new Promise((r) => setTimeout(r, 300));

      // Generate random salt
      const salt = generateIdentitySecret();

      setStep(t("steps.hashingPassword"));
      setProgress(50);
      await new Promise((r) => setTimeout(r, 400));

      // Hash password with salt
      const passwordField = passwordToField(password);
      const hash = await poseidonHash([passwordField, salt]);

      setStep(t("steps.storingHash"));
      setProgress(80);
      await new Promise((r) => setTimeout(r, 300));

      const hashHex = "0x" + hash.toString(16).padStart(64, "0");
      setStoredCredential({
        salt,
        passwordHash: hashHex,
      });

      setStep(t("steps.registrationComplete"));
      setProgress(100);
    } catch (err) {
      console.error("Registration failed:", err);
    } finally {
      setIsRegistering(false);
    }
  };

  // Authenticate with password
  const authenticate = async () => {
    if (!loginPassword.trim() || !storedCredential) return;

    setIsAuthenticating(true);
    setProgress(0);
    setProofResult(null);

    const startTime = Date.now();

    try {
      setStep(t("steps.preparingProof"));
      setProgress(20);
      await new Promise((r) => setTimeout(r, 300));

      // Compute hash of entered password
      const passwordField = passwordToField(loginPassword);

      setStep(t("steps.computingHash"));
      setProgress(40);

      const computedHash = await poseidonHash([passwordField, storedCredential.salt]);
      const computedHashHex = "0x" + computedHash.toString(16).padStart(64, "0");

      setStep(t("steps.generatingProof"));
      setProgress(60);
      await new Promise((r) => setTimeout(r, 500));

      setStep(t("steps.verifyingProof"));
      setProgress(80);
      await new Promise((r) => setTimeout(r, 300));

      // Verify hash matches
      const verified = computedHashHex.toLowerCase() === storedCredential.passwordHash.toLowerCase();

      setStep(verified ? t("steps.authSuccess") : t("steps.authFailed"));
      setProgress(100);

      setProofResult({
        verified,
        proofTime: Date.now() - startTime,
      });
    } catch (err) {
      console.error("Authentication failed:", err);
      setProofResult({
        verified: false,
        proofTime: Date.now() - startTime,
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Reset demo
  const resetDemo = () => {
    setPassword("");
    setLoginPassword("");
    setStoredCredential(null);
    setProofResult(null);
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("intro.title")}</AlertTitle>
        <AlertDescription>{t("intro.description")}</AlertDescription>
      </Alert>

      {/* Comparison: Traditional vs ZK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              {t("comparison.traditional.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>{t("comparison.traditional.item1")}</li>
              <li>{t("comparison.traditional.item2")}</li>
              <li>{t("comparison.traditional.item3")}</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              {t("comparison.zkBased.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>{t("comparison.zkBased.item1")}</li>
              <li>{t("comparison.zkBased.item2")}</li>
              <li>{t("comparison.zkBased.item3")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Main Demo */}
      <Tabs defaultValue="register" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">{t("tabs.register")}</TabsTrigger>
          <TabsTrigger value="login" disabled={!storedCredential}>
            {t("tabs.login")}
          </TabsTrigger>
        </TabsList>

        {/* Registration Tab */}
        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("register.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!storedCredential ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("register.passwordLabel")}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t("register.passwordPlaceholder")}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("register.passwordHint")}
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    {isRegistering ? (
                      <motion.div
                        key="registering"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{step}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Button
                          onClick={registerPassword}
                          disabled={!password.trim()}
                          className="w-full"
                        >
                          <Database className="h-4 w-4 mr-2" />
                          {t("register.registerButton")}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {t("register.success")}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("register.storedHash")}</span>
                        <code className="block mt-1 text-xs break-all">
                          {storedCredential.passwordHash}
                        </code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("register.salt")}</span>
                        <code className="block mt-1 text-xs">
                          {storedCredential.salt.toString(16).slice(0, 20)}...
                        </code>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      {t("register.securityNote")}
                    </AlertDescription>
                  </Alert>

                  <Button variant="outline" onClick={resetDemo} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t("register.resetButton")}
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Login Tab */}
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("login.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginPassword">{t("login.passwordLabel")}</Label>
                <div className="relative">
                  <Input
                    id="loginPassword"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder={t("login.passwordPlaceholder")}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {isAuthenticating ? (
                  <motion.div
                    key="authenticating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{step}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(elapsedTime)}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Button
                      onClick={authenticate}
                      disabled={!loginPassword.trim()}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t("login.authenticateButton")}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result */}
              {proofResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg ${
                    proofResult.verified
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {proofResult.verified ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {t("result.success")}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {t("result.failed")}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {proofResult.verified
                      ? t("result.successDesc")
                      : t("result.failedDesc")}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {t("result.proofTime")}: {formatTime(proofResult.proofTime)}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle>{t("security.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{t("security.features.salted.title")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("security.features.salted.description")}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{t("security.features.zkProof.title")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("security.features.zkProof.description")}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Key className="h-5 w-5 text-primary" />
                <h4 className="font-medium">{t("security.features.poseidon.title")}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("security.features.poseidon.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
