"use client";

import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";

interface ConfirmVoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVote: number | null;
  onConfirm: () => void;
}

export function ConfirmVoteDialog({
  open,
  onOpenChange,
  selectedVote,
  onConfirm,
}: ConfirmVoteDialogProps) {
  const t = useTranslations("demo.confirmDialog");
  const common = useTranslations("common");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-sm font-medium">{t("yourVote")}</span>
            <Badge
              variant={selectedVote === 1 ? "default" : "secondary"}
              className="flex items-center gap-2"
            >
              {selectedVote === 1 ? (
                <>
                  <ThumbsUp className="h-4 w-4" />
                  {common("yes")}
                </>
              ) : (
                <>
                  <ThumbsDown className="h-4 w-4" />
                  {common("no")}
                </>
              )}
            </Badge>
          </div>

          <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg flex gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {t("warning")}
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {t("confirmSubmit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
