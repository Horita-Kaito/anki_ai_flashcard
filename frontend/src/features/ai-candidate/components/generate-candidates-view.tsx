"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, RefreshCw, Sparkles } from "lucide-react";
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
import { GenerationStatusBanner } from "./generation-status-banner";
import { toAiErrorMessage, toAsyncFailureMessage } from "../lib/ai-error-message";
import { useNoteSeed } from "@/entities/note-seed/api/note-seed-queries";
import { noteSeedKeys } from "@/entities/note-seed/api/note-seed-queries";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";

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
  const previewQuestions = pendingCandidates.slice(0, 3).map((c) => c.question);
  const selectedTemplateName =
    templates?.find((t) => t.id === templateId)?.name ?? "指定なし";

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
              <Label
                htmlFor="regenerate-feedback"
                className="text-xs text-foreground"
              >
                どこを変えたいですか? (任意)
              </Label>
              <Textarea
                id="regenerate-feedback"
                value={regenerateFeedback}
                onChange={(e) => setRegenerateFeedback(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="例: 答えが長すぎる / もっと細かく分割して / 用語の定義より使い分けを問うてほしい"
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

      {/* AI アクションセクション: メモ本文と差別化するため forest トーンで
          「ここで生成する」場所と分かるように見せる。 */}
      <section
        aria-labelledby="ai-action"
        className="space-y-3 rounded-xl border border-[color-mix(in_oklch,var(--forest),transparent_70%)] bg-[var(--forest-faint)] p-4 md:p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="ai-action"
            className="flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <Sparkles className="size-4" aria-hidden />
            AI で候補を作る
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowOptions((v) => !v)}
            aria-expanded={showOptions}
            aria-controls="ai-options"
          >
            <ChevronDown
              className={`size-3.5 transition-transform ${showOptions ? "rotate-180" : ""}`}
              aria-hidden
            />
            オプション
          </Button>
        </div>

        <GenerationStatusBanner
          status={generationStatus}
          isInFlight={isInFlight}
          previewQuestions={previewQuestions}
        />

        {/* メイン CTA: 新規生成 / 追加生成 を 1 つのボタンにまとめる */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            size="touch"
            className="min-h-12 flex-1 text-base font-semibold"
            onClick={hasAnyCandidates ? handleAddMore : handleGenerate}
            disabled={isInFlight || isDispatching}
          >
            {isInFlight || isDispatching ? (
              <>
                <RefreshCw className="size-4 animate-spin" aria-hidden />
                生成中...
              </>
            ) : hasAnyCandidates ? (
              <>
                <Plus className="size-4" aria-hidden />
                さらに候補を追加
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden />
                AI で候補生成
              </>
            )}
          </Button>
          {hasPending && (
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="min-h-12"
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={isInFlight || isDispatching}
            >
              <RefreshCw className="size-4" aria-hidden />
              再生成
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">モデル: 既定設定</Badge>
          <Badge variant="outline">テンプレート: {selectedTemplateName}</Badge>
          <Badge variant="outline">件数: メモ量から自動</Badge>
        </div>

        {/* オプション (折りたたみ): 分野テンプレート選択 */}
        {showOptions && (
          <div id="ai-options" className="space-y-1.5 pt-1">
            <Label
              htmlFor="template"
              className="text-xs text-muted-foreground"
            >
              分野テンプレート
            </Label>
            <NativeSelect
              id="template"
              value={templateId ?? ""}
              onChange={(e) =>
                setTemplateId(e.target.value === "" ? null : Number(e.target.value))
              }
              disabled={isInFlight}
            >
              <option value="">指定しない</option>
              {templates?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
            <p className="text-[11px] text-muted-foreground">
              候補数はメモの情報量から自動調整。足りなければ「さらに追加」で増やせます。
            </p>
          </div>
        )}
      </section>

      {/* 候補一覧 */}
      {candidatesLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !candidates || candidates.length === 0 ? (
        <EmptyState
          icon={<Sparkles aria-hidden />}
          title={isInFlight ? "候補を生成しています" : "まだ候補がありません"}
          description={
            isInFlight
              ? "完成までしばらくお待ちください。できあがると自動で表示されます。"
              : "上のボタンで AI 生成を始めると、このメモからカード候補が並びます。"
          }
          action={
            !isInFlight && !hasAnyCandidates ? (
              <Button
                type="button"
                size="touch"
                onClick={handleGenerate}
                disabled={isDispatching}
              >
                <Sparkles data-icon="inline-start" />
                候補を生成する
              </Button>
            ) : undefined
          }
        />
      ) : (
        <CandidateReviewList
          candidates={candidates}
          idPrefix={`note-${noteSeedId}-candidates`}
        />
      )}
    </div>
  );
}
