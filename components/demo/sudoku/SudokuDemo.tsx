"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid3X3,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTranslations } from "next-intl";

// Sample puzzles
const PUZZLES = [
  {
    name: "Easy",
    puzzle: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ],
  },
];

export function SudokuDemo() {
  const t = useTranslations("demo.sudoku");
  const [selectedPuzzle, setSelectedPuzzle] = useState(0);
  const [userSolution, setUserSolution] = useState<number[][]>(
    PUZZLES[0].solution.map((row) => [...row])
  );
  const [showSolution, setShowSolution] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [proofResult, setProofResult] = useState<{
    verified: boolean;
    proofTime: number;
  } | null>(null);

  const puzzle = PUZZLES[selectedPuzzle].puzzle;
  const correctSolution = PUZZLES[selectedPuzzle].solution;

  const handleCellChange = (row: number, col: number, value: string) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= 9) {
      const newSolution = userSolution.map((r) => [...r]);
      newSolution[row][col] = num;
      setUserSolution(newSolution);
    }
  };

  const verifySolution = async () => {
    setIsVerifying(true);
    setProgress(0);
    setProofResult(null);

    const startTime = Date.now();

    try {
      setStep(t("steps.checkingClues"));
      setProgress(20);
      await new Promise((r) => setTimeout(r, 300));

      // Check solution matches puzzle clues
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (puzzle[i][j] !== 0 && puzzle[i][j] !== userSolution[i][j]) {
            throw new Error("Clue mismatch");
          }
        }
      }

      setStep(t("steps.checkingRows"));
      setProgress(40);
      await new Promise((r) => setTimeout(r, 200));

      // Check rows
      for (let i = 0; i < 9; i++) {
        const row = new Set(userSolution[i]);
        if (row.size !== 9 || row.has(0)) throw new Error("Invalid row");
      }

      setStep(t("steps.checkingCols"));
      setProgress(60);
      await new Promise((r) => setTimeout(r, 200));

      // Check columns
      for (let j = 0; j < 9; j++) {
        const col = new Set(userSolution.map((row) => row[j]));
        if (col.size !== 9 || col.has(0)) throw new Error("Invalid column");
      }

      setStep(t("steps.checkingBoxes"));
      setProgress(80);
      await new Promise((r) => setTimeout(r, 200));

      // Check 3x3 boxes
      for (let box = 0; box < 9; box++) {
        const boxRow = Math.floor(box / 3) * 3;
        const boxCol = (box % 3) * 3;
        const values = new Set<number>();
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            values.add(userSolution[boxRow + i][boxCol + j]);
          }
        }
        if (values.size !== 9 || values.has(0)) throw new Error("Invalid box");
      }

      setStep(t("steps.generatingProof"));
      setProgress(95);
      await new Promise((r) => setTimeout(r, 500));

      setStep(t("steps.verified"));
      setProgress(100);

      setProofResult({
        verified: true,
        proofTime: Date.now() - startTime,
      });
    } catch {
      setStep(t("steps.failed"));
      setProgress(100);
      setProofResult({
        verified: false,
        proofTime: Date.now() - startTime,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const resetSolution = () => {
    setUserSolution(correctSolution.map((row) => [...row]));
    setProofResult(null);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("intro.title")}</AlertTitle>
        <AlertDescription>{t("intro.description")}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sudoku Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                {t("grid.title")}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSolution(!showSolution)}
              >
                {showSolution ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-9 gap-0 border-2 border-foreground rounded max-w-[360px] mx-auto">
              {userSolution.map((row, i) =>
                row.map((cell, j) => {
                  const isClue = puzzle[i][j] !== 0;
                  const borderRight = (j + 1) % 3 === 0 && j < 8;
                  const borderBottom = (i + 1) % 3 === 0 && i < 8;

                  return (
                    <input
                      key={`${i}-${j}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={showSolution ? (cell || "") : (isClue ? cell : "")}
                      onChange={(e) => handleCellChange(i, j, e.target.value)}
                      disabled={isClue}
                      className={`
                        w-10 h-10 text-center text-lg font-medium
                        border border-muted
                        ${borderRight ? "border-r-2 border-r-foreground" : ""}
                        ${borderBottom ? "border-b-2 border-b-foreground" : ""}
                        ${isClue ? "bg-muted font-bold" : "bg-background"}
                        focus:outline-none focus:ring-2 focus:ring-primary
                      `}
                    />
                  );
                })
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={resetSolution}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("grid.reset")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("verify.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("verify.description")}
            </p>

            <AnimatePresence mode="wait">
              {isVerifying ? (
                <motion.div
                  key="verifying"
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
                  <Button onClick={verifySolution} className="w-full">
                    <Shield className="h-4 w-4 mr-2" />
                    {t("verify.button")}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

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
                        {t("result.verified")}
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
                    ? t("result.verifiedDesc")
                    : t("result.failedDesc")}
                </p>
              </motion.div>
            )}

            {/* What's proven */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{t("verify.proven")}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {t("verify.provenItems.valid")}</li>
                <li>• {t("verify.provenItems.matches")}</li>
              </ul>
              <h4 className="font-medium mt-3 mb-2">{t("verify.hidden")}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• {t("verify.hiddenItems.solution")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>{t("useCases.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <span className="text-2xl mb-2 block">🏆</span>
              <h4 className="font-medium">{t("useCases.competitions.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("useCases.competitions.description")}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <span className="text-2xl mb-2 block">🎮</span>
              <h4 className="font-medium">{t("useCases.gaming.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("useCases.gaming.description")}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <span className="text-2xl mb-2 block">📚</span>
              <h4 className="font-medium">{t("useCases.education.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("useCases.education.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
