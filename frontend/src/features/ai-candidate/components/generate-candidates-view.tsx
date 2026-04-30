"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, Plus, Loader2 } from "lucide-react";
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
import { BatchAdoptBar } from "./batch-adopt-bar";
import { CandidateCard } from "./candidate-card";
import { toAiErrorMessage, toAsyncFailureMessage } from "../lib/ai-error-message";
import { useNoteSeed } from "@/entities/note-seed/api/note-seed-queries";
import { noteSeedKeys } from "@/entities/note-seed/api/note-seed-queries";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

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
    } else if (wasInFlight && current === "failed") {
      toast.error(toAsyncFailureMessage(generationStatus?.error_reason));
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
    }
  }, [
    generationStatus?.status,
    generationStatus?.candidates_count,
    generationStatus?.error_reason,
    noteSeedId,
    qc,
  ]);

  const pendingCandidates =
    candidates?.filter((c) => c.status === "pending") ?? [];
  const historyCandidates =
    candidates?.filter((c) => c.status !== "pending") ?? [];
  const hasPending = pendingCandidates.length > 0;
  const hasAnyCandidates = (candidates?.length ?? 0) > 0;

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
    try {
      await regenerateMutation.mutateAsync({ domain_template_id: templateId });
      toast.success("AI 再生成を開始しました");
    } catch (err: unknown) {
      toast.error(toAiErrorMessage(err, "再生成の開始に失敗しました"));
    }
  }

  if (noteLoading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (!note) {
    return <p role="alert">メモが見つかりません</p>;
  }

  return (
    <div className="space-y-6 pb-32 md:pb-8">
      <ConfirmDialog
        open={regenerateConfirmOpen}
        title="再生成"
        description="現在の未採用候補をすべて却下して、新しい候補を生成します。よろしいですか?"
        confirmLabel="再生成する"
        variant="destructive"
        onConfirm={handleRegenerate}
        onCancel={() => setRegenerateConfirmOpen(false)}
        loading={regenerateMutation.isPending}
      />
      {/* 生成設定 */}
      <section className="border rounded-xl p-4 md:p-5 space-y-4">
        <h2 className="font-medium flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden />
          AI 生成設定
        </h2>

        <div className="space-y-1.5">
          <label htmlFor="template" className="text-sm font-medium">
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
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background disabled:opacity-60"
          >
            <option value="">指定しない</option>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          候補数はメモの情報量から自動で調整されます。足りなければ生成後に「さらに追加」で増やせます。
        </p>

        {isInFlight && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-md px-3 py-2"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>
              AI が候補を生成しています。画面を離れても続きます。完了すると自動で表示されます。
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {!hasAnyCandidates ? (
            <Button
              type="button"
              size="lg"
              className="min-h-11"
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
              className="min-h-11"
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
              className="min-h-11"
              onClick={() => setRegenerateConfirmOpen(true)}
              disabled={isInFlight || isDispatching}
            >
              <RefreshCw className="size-4" aria-hidden />
              再生成
            </Button>
          )}
        </div>
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
        <>
          {hasPending && (
            <section
              aria-labelledby="pending-section"
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 id="pending-section" className="font-medium">
                  未採用候補 ({pendingCandidates.length})
                </h2>
                <BatchAdoptBar
                  candidateIds={pendingCandidates.map((c) => c.id)}
                />
              </div>
              <div className="space-y-3">
                {pendingCandidates.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    defaultDeckId={undefined}
                  />
                ))}
              </div>
            </section>
          )}

          {historyCandidates.length > 0 && (
            <section
              aria-labelledby="history-section"
              className="space-y-3"
            >
              <h2
                id="history-section"
                className="text-sm font-medium text-muted-foreground"
              >
                履歴 ({historyCandidates.length})
              </h2>
              <div className="space-y-3">
                {historyCandidates.map((c) => (
                  <CandidateCard key={c.id} candidate={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
