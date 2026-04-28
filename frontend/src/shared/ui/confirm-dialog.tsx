"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * 軽量な確認ダイアログ。
 * - PC (md+): 中央モーダル
 * - モバイル: 画面下部からせり上がるボトムシート (safe-area 考慮)
 *
 * `confirm()` のネイティブダイアログに代わる用途。
 * `<dialog>` ではなく role="dialog" の div で実装し、外側クリック / Esc で閉じる。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="
          bg-background border-t md:border md:rounded-xl rounded-t-xl
          w-full md:max-w-md
          p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-5
          space-y-4
          shadow-xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 id="confirm-dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            size="lg"
            className="min-h-12"
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
