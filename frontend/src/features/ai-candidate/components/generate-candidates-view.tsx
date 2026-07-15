"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  aiCandidateKeys,
  useAddMoreCandidates,
  useCandidatesForNote,
  useGenerateCandidates,
  useGenerationStatus,
  useRegenerateCandidates,
} from "../api/ai-candidate-queries";
import { CandidateReviewList } from "./candidate-review-list";
import { toAiErrorMessage, toAsyncFailureMessage } from "../lib/ai-error-message";
import { useNoteSeed } from "@/entities/note-seed/api/note-seed-queries";
import { noteSeedKeys } from "@/entities/note-seed/api/note-seed-queries";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Skeleton } from "@/shared/ui/skeleton";

interface GenerateCandidatesViewProps {
  noteSeedId: number;
}

export function GenerateCandidatesView({
  noteSeedId,
}: GenerateCandidatesViewProps) {
  const qc = useQueryClient();
  const { data: note, isLoading: noteLoading } = useNoteSeed(noteSeedId);
  const { data: templates } = useDomainTemplateList();
  const { data: generationStatus } = useGenerationStatus(noteSeedId);
  const isInFlight =
    generationStatus?.status === "queued" ||
    generationStatus?.status === "processing";

  // 進行中は候補一覧を 3 秒ごとに refetch して、完了直後に候補が表示されるようにする
  const { data: candidates, isLoading: candidatesLoading } =
    useCandidatesForNote(noteSeedId, undefined, {
      refetchInterval: isInFlight ? 3000 : false,
    });

  const [userTemplateId, setUserTemplateId] = useState<
    number | null | undefined
  >(undefined);
  const templateId: number | null =
    userTemplateId !== undefined
      ? userTemplateId
      : (note?.domain_template_id ?? null);
  const setTemplateId = (id: number | null) => setUserTemplateId(id);

  const generateMutation = useGenerateCandidates(noteSeedId);
  const regenerateMutation = useRegenerateCandidates(noteSeedId);
  const addMoreMutation = useAddMoreCandidates(noteSeedId);
  const isDispatching =
    generateMutation.isPending ||
    regenerateMutation.isPending ||
    addMoreMutation.isPending;

  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  // 進行中 → 完了 への遷移を検出して toast + 関連 query を invalidate する
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const current = generationStatus?.status ?? null;
    const prev = prevStatusRef.current;
    prevStatusRef.current = current;

    if (!current || current === prev) return;

    const wasInFlight = prev === "queued" || prev === "processing";

    if (wasInFlight && current === "success") {
      const count = generationStatus?.candidates_count ?? 0;
      toast.success(`AI が ${count} 件の候補を生成しました`);
      qc.invalidateQueries({ queryKey: aiCandidateKeys.forNote(noteSeedId) });
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
    } else if (wasInFlight && current === "partial_success") {
      const count = generationStatus?.candidates_count ?? 0;
      const failed = generationStatus?.chunks_failed ?? 0;
      const total = generationStatus?.chunks_total ?? 0;
      toast.warning(
        `AI が ${count} 件の候補を生成しました (${failed}/${total} チャンクが失敗)`
      );
      qc.invalidateQueries({ queryKey: aiCandidateKeys.forNote(noteSeedId) });
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
    } else if (wasInFlight && current === "failed") {
      toast.error(toAsyncFailureMessage(generationStatus?.error_reason));
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
    }
  }, [
    generationStatus?.status,
    generationStatus?.candidates_count,
    generationStatus?.error_reason,
    generationStatus?.chunks_failed,
    generationStatus?.chunks_total,
    noteSeedId,
    qc,
  ]);

  const pendingCandidates =
    candidates?.filter((c) => c.status === "pending") ?? [];
  const hasPending = pendingCandidates.length > 0;
  const hasAnyCandidates = (candidates?.length ?? 0) > 0;
  const progressSteps = ["構造化", "方針読込", "生成", "判定"] as const;
  const activeStepIndex = generationStatus?.status === "queued" ? 1 : 2;
  const previewQuestions = pendingCandidates.slice(0, 3).map((c) => c.question);

  async function handleGenerate() {
    try {
      await generateMutation.mutateAsync({ domain_template_id: templateId });
      toast.success("AI 生成を開始しました。完了したら候補が表示されます");
    } catch (err: unknown) {
      toast.error(toAiErrorMessage(err, "生成の開始に失敗しました"));
    }
  }

  async function handleAddMore() {
    try {
      await addMoreMutation.mutateAsync({ domain_template_id: templateId });
      toast.success("AI 生成を開始しました");
    } catch (err: unknown) {
      toast.error(toAiErrorMessage(err, "追加生成の開始に失敗しました"));
    }
  }

  async function handleRegenerate() {
    setRegenerateConfirmOpen(false);
    const feedback = regenerateFeedback.trim();
    try {
      await regenerateMutation.mutateAsync({
        domain_template_id: templateId,
        feedback: feedback === "" ? null : feedback,
      });
      setRegenerateFeedback("");
      toast.success("AI 再生成を開始しました");
    } catch (err: unknown) {
      toast.error(toAiErrorMessage(err, "再生成の開始に失敗しました"));
    }
  }

  if (noteLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!note) {
    return <p role="alert">メモが見つかりません</p>;
  }

  return (
    <div className="space-y-6 pb-32 md:pb-8">
      <ConfirmDialog
        open={regenerateConfirmOpen}
        title="候補を作り直す"
        description={
          <div className="space-y-3">
            <p>
              現在の未採用候補はすべて却下されます。残したい候補は先に採用してください。
            </p>
            <div className="space-y-1.5">
              <label
                htmlFor="regenerate-feedback"
                className="block text-xs font-medium text-foreground"
              >
                どこを変えたいですか? (任意)
              </label>
              <textarea
                id="regenerate-feedback"
                value={regenerateFeedback}
                onChange={(e) => setRegenerateFeedback(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="例: 答えが長すぎる / もっと細かく分割して / 用語の定義より使い分けを問うてほしい"
                className="w-full resize-y rounded-md border bg-background px-3 py-2 text-base md:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                前回の候補と同じ切り口は自動的に避けられます。ここに書いた指示は最優先で反映されます。
              </p>
            </div>
          </div>
        }
        confirmLabel="作り直す"
        variant="destructive"
        onConfirm={handleRegenerate}
        onCancel={() => setRegenerateConfirmOpen(false)}
        loading={regenerateMutation.isPending}
      />
      {/* AI アクションバー: 視覚的にメモ本文セクションと差別化するため、
          border カードではなく「アクションするための場所」と分かるトーン
          (グラデ + アクセントバー) を使う。SP では sticky な性質を持たせる。 */}
      <section
        aria-labelledby="ai-action"
        className="
          relative overflow-hidden rounded-lg
          bg-[var(--forest-faint)]
          border border-[color-mix(in_oklch,var(--forest),transparent_70%)]
          p-4 md:p-5 space-y-3
        "
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="ai-action"
            className="text-sm font-semibold flex items-center gap-2 text-primary"
          >
            <Sparkles className="size-4" aria-hidden />
            AI で候補を作る
          </h2>
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-8"
            aria-expanded={showOptions}
            aria-controls="ai-options"
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`}
              aria-hidden
            />
            オプション
          </button>
        </div>

        {/* 進行中インジケータ (常に最も目立つ位置に) */}
        {isInFlight && (
          <div role="status" aria-live="polite" className="space-y-3 rounded-md bg-card/75 px-3 py-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
              <span className="leading-snug">
                候補を生成しています。およそ 20-40 秒で反映されます。
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-3/4 rounded-full bg-primary transition-all" />
            </div>
            <ol className="grid grid-cols-4 gap-1 text-[11px] text-muted-foreground">
              {progressSteps.map((step, i) => (
                <li
                  key={step}
                  className={i <= activeStepIndex ? "font-medium text-primary" : ""}
                >
                  {i < activeStepIndex ? "✓ " : i === activeStepIndex ? "• " : ""}
                  {step}
                </li>
              ))}
            </ol>
            {previewQuestions.length > 0 && (
              <div className="space-y-1 border-t pt-2">
                <p className="text-[11px] font-medium text-muted-foreground">先行プレビュー</p>
                {previewQuestions.map((q, i) => (
                  <p key={`${q}-${i}`} className="knowledge-text line-clamp-1 text-sm">
                    {q}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* partial_success バナー: 長文メモのチャンク分割で一部失敗した場合、
            toast は一瞬で消えてしまうため、候補一覧の冒頭に常時バナーを出して
            「再生成」へ自然に誘導する。 */}
        {!isInFlight &&
          generationStatus?.status === "partial_success" &&
          (generationStatus?.chunks_failed ?? 0) > 0 && (
            <div
              role="alert"
            className="flex items-start gap-2 text-sm bg-[var(--persimmon-faint)] text-foreground rounded-md px-3 py-2"
            >
              <AlertTriangle
                className="size-4 shrink-0 mt-0.5"
                aria-hidden
              />
              <div className="space-y-1 leading-snug">
                <p>
                  メモが長いため複数の塊に分けて生成し、
                  {generationStatus.chunks_failed} / {generationStatus.chunks_total}
                  {" "}個の塊で失敗しました。
                </p>
                <p className="text-xs text-muted-foreground">
                  生成できた候補はそのままレビューできます。空いた分は再生成できます。
                </p>
              </div>
            </div>
          )}

        {/* 生成失敗バナー: toast は一瞬で消えるため、失敗状態を常時提示して
            下のボタンからそのまま再試行へ誘導する。 */}
        {!isInFlight && generationStatus?.status === "failed" && (
          <div
            role="alert"
            className="flex items-start gap-2 text-sm bg-[var(--persimmon-faint)] text-foreground rounded-md px-3 py-2"
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
            <div className="space-y-1 leading-snug">
              <p>{toAsyncFailureMessage(generationStatus?.error_reason)}</p>
              <p className="text-xs text-muted-foreground">
                下のボタンからもう一度生成できます。
              </p>
            </div>
          </div>
        )}

        {/* メイン CTA: 大きく、肩書きが揺れない (新規生成 / 追加生成 を 1 つのボタンにまとめる) */}
        <div className="flex flex-col sm:flex-row gap-2">
          {!hasAnyCandidates ? (
            <Button
              type="button"
              size="lg"
              className="flex-1 min-h-12 text-base font-semibold"
              onClick={handleGenerate}
              disabled={isInFlight || isDispatching}
            >
              {isInFlight || isDispatching ? (
                <>
                  <RefreshCw className="size-4 animate-spin" aria-hidden />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  AI で候補生成
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="flex-1 min-h-12 text-base font-semibold"
              onClick={handleAddMore}
              disabled={isInFlight || isDispatching}
            >
              {isInFlight || isDispatching ? (
                <>
                  <RefreshCw className="size-4 animate-spin" aria-hidden />
                  生成中...
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden />
                  さらに候補を追加
                </>
              )}
            </Button>
          )}
          {hasPending && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-12"
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={isInFlight || isDispatching}
            >
              <RefreshCw className="size-4" aria-hidden />
              再生成
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full bg-card px-2 py-1">モデル: 既定設定</span>
          <span className="rounded-full bg-card px-2 py-1">
            テンプレート: {templates?.find((t) => t.id === templateId)?.name ?? "指定なし"}
          </span>
          <span className="rounded-full bg-card px-2 py-1">件数: メモ量から自動</span>
        </div>

        {/* オプション (折りたたみ): 分野テンプレート選択 */}
        {showOptions && (
          <div id="ai-options" className="space-y-1.5 pt-1">
            <label htmlFor="template" className="text-xs font-medium text-muted-foreground">
              分野テンプレート
            </label>
            <select
              id="template"
              value={templateId ?? ""}
              onChange={(e) =>
                setTemplateId(
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              disabled={isInFlight}
              className="w-full border rounded-md px-3 py-2 text-sm min-h-10 bg-background disabled:opacity-60"
            >
              <option value="">指定しない</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              候補数はメモの情報量から自動調整。足りなければ「さらに追加」で増やせます。
            </p>
          </div>
        )}
      </section>

      {/* 候補一覧 */}
      {candidatesLoading ? (
        <p className="text-muted-foreground">候補を読み込み中...</p>
      ) : !candidates || candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-xl">
          {isInFlight
            ? "生成完了までしばらくお待ちください。"
            : "まだ候補がありません。上のボタンで AI 生成を開始してください。"}
        </p>
      ) : (
        <CandidateReviewList
          candidates={candidates}
          idPrefix={`note-${noteSeedId}-candidates`}
        />
      )}
    </div>
  );
}
