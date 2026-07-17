"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { GenerationStatus } from "../api/endpoints";
import { toAsyncFailureMessage } from "../lib/ai-error-message";

const PROGRESS_STEPS = ["構造化", "方針読込", "生成", "判定"] as const;

interface GenerationStatusBannerProps {
  status?: GenerationStatus;
  isInFlight: boolean;
  /** 生成中に先行表示するプレビュー問題文 (最大 3 件)。 */
  previewQuestions: string[];
}

/**
 * AI 生成の状態バナー。
 * - 進行中: 何が起きているか一文 + ステップ表示 + 先行プレビュー
 * - partial_success / failed: 常時バナーで再生成へ誘導 (toast は一瞬で消えるため)
 */
export function GenerationStatusBanner({
  status,
  isInFlight,
  previewQuestions,
}: GenerationStatusBannerProps) {
  if (isInFlight) {
    // queued の間は「構造化」まで、processing 以降は「生成」ステップを進行中扱いにする
    const activeStepIndex = status?.status === "queued" ? 1 : 2;
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-3 rounded-lg bg-card/80 px-3 py-3"
      >
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          <span className="leading-snug">
            AI がカード候補を作っています。およそ 20〜40 秒で表示されます。
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-3/4 rounded-full bg-primary transition-all" />
        </div>
        <ol className="grid grid-cols-4 gap-1 text-[11px] text-muted-foreground">
          {PROGRESS_STEPS.map((step, i) => (
            <li
              key={step}
              aria-current={i === activeStepIndex ? "step" : undefined}
              className={
                i <= activeStepIndex ? "font-medium text-primary" : undefined
              }
            >
              {i < activeStepIndex ? "✓ " : i === activeStepIndex ? "● " : "○ "}
              {step}
            </li>
          ))}
        </ol>
        {previewQuestions.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              先行プレビュー
            </p>
            {previewQuestions.map((q, i) => (
              <p key={`${q}-${i}`} className="knowledge-text line-clamp-1 text-sm">
                {q}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status?.status === "partial_success" && (status?.chunks_failed ?? 0) > 0) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg bg-[var(--persimmon-faint)] px-3 py-2 text-sm text-foreground"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="space-y-1 leading-snug">
          <p>
            メモが長いため複数の塊に分けて生成し、{status.chunks_failed} /{" "}
            {status.chunks_total} 個の塊で失敗しました。
          </p>
          <p className="text-xs text-muted-foreground">
            生成できた候補はそのままレビューできます。空いた分は再生成できます。
          </p>
        </div>
      </div>
    );
  }

  if (status?.status === "failed") {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg bg-[var(--persimmon-faint)] px-3 py-2 text-sm text-foreground"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="space-y-1 leading-snug">
          <p>{toAsyncFailureMessage(status?.error_reason)}</p>
          <p className="text-xs text-muted-foreground">
            下のボタンからもう一度生成できます。
          </p>
        </div>
      </div>
    );
  }

  return null;
}
