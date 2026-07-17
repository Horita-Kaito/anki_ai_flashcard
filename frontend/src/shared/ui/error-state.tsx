"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({
  title = "読み込みに失敗しました",
  description = "通信状態を確認して、もう一度お試しください。",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center",
        className
      )}
    >
      <AlertTriangle aria-hidden className="size-6 text-destructive" />
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="touch" onClick={onRetry}>
          <RotateCcw data-icon="inline-start" />
          再試行
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
