"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useAddMoreCandidates,
  useCandidatesForNote,
  useGenerateCandidates,
  useRegenerateCandidates,
} from "../api/ai-candidate-queries";
import { BatchAdoptBar } from "./batch-adopt-bar";
import { CandidateCard } from "./candidate-card";
import { useNoteSeed } from "@/entities/note-seed/api/note-seed-queries";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { Button } from "@/shared/ui/button";

interface GenerateCandidatesViewProps {
  noteSeedId: number;
}

export function GenerateCandidatesView({
  noteSeedId,
}: GenerateCandidatesViewProps) {
  const { data: note, isLoading: noteLoading } = useNoteSeed(noteSeedId);
  const { data: templates } = useDomainTemplateList();
  const { data: candidates, isLoading: candidatesLoading } =
    useCandidatesForNote(noteSeedId);

  const [templateId, setTemplateId] = useState<number | null>(
    note?.domain_template_id ?? null
  );

  const generateMutation = useGenerateCandidates(noteSeedId);
  const regenerateMutation = useRegenerateCandidates(noteSeedId);
  const addMoreMutation = useAddMoreCandidates(noteSeedId);

  // 初回ロード時に note.domain_template_id を反映
  if (note && templateId === null && note.domain_template_id) {
    setTemplateId(note.domain_template_id);
  }

  const pendingCandidates = candidates?.filter((c) => c.status === "pending") ?? [];
  const historyCandidates = candidates?.filter((c) => c.status !== "pending") ?? [];
  const hasPending = pendingCandidates.length > 0;
  const hasAnyCandidates = (candidates?.length ?? 0) > 0;

  async function handleGenerate() {
    try {
      const result = await generateMutation.mutateAsync({
        domain_template_id: templateId,
      });
      const m = result.meta;
      toast.success(
        `${m.model} で ${result.candidates.length} 件生成 (${m.duration_ms}ms, $${m.cost_usd.toFixed(6)})`
      );
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } }).response?.status;
      if (status === 429) {
        toast.error("本日の生成上限に達しました");
      } else if (status === 502) {
        toast.error("AI の応答解析に失敗しました。再試行してください");
      } else {
        toast.error("生成に失敗しました");
      }
    }
  }

  async function handleAddMore() {
    try {
      const result = await addMoreMutation.mutateAsync({
        domain_template_id: templateId,
      });
      const m = result.meta;
      toast.success(
        `${m.model} で ${result.candidates.length} 件追加生成 (${m.duration_ms}ms, $${m.cost_usd.toFixed(6)})`
      );
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } }).response?.status;
      if (status === 502) {
        toast.error("AI の応答解析に失敗しました。再試行してください");
      } else {
        toast.error("追加生成に失敗しました");
      }
    }
  }

  async function handleRegenerate() {
    if (
      !confirm(
        "現在の未採用候補をすべて却下して、新しい候補を生成します。よろしいですか?"
      )
    ) {
      return;
    }
    try {
      const result = await regenerateMutation.mutateAsync({
        domain_template_id: templateId,
      });
      const m = result.meta;
      toast.success(
        `${m.model} で ${result.candidates.length} 件再生成 (${m.duration_ms}ms, $${m.cost_usd.toFixed(6)})`
      );
    } catch {
      toast.error("再生成に失敗しました");
    }
  }

  if (noteLoading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (!note) {
    return <p role="alert">メモが見つかりません</p>;
  }

  return (
    <div className="space-y-6 pb-8">
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
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
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

        <div className="flex flex-col sm:flex-row gap-2">
          {!hasAnyCandidates ? (
            <Button
              type="button"
              size="lg"
              className="min-h-11"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
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
              disabled={addMoreMutation.isPending}
            >
              {addMoreMutation.isPending ? (
                <>
                  <RefreshCw className="size-4 animate-spin" aria-hidden />
                  追加生成中...
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
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
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
          まだ候補がありません。上のボタンで AI 生成を開始してください。
        </p>
      ) : (
        <>
          {hasPending && (
            <section aria-labelledby="pending-section" className="space-y-3">
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
            <section aria-labelledby="history-section" className="space-y-3">
              <h2 id="history-section" className="text-sm font-medium text-muted-foreground">
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
