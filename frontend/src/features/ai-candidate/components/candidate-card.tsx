"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  useAdoptCandidate,
  useRejectCandidate,
  useRestoreCandidate,
  useUpdateCandidate,
} from "../api/ai-candidate-queries";
import { CARD_TYPE_LABELS } from "@/entities/card/types";
import type { AiCardCandidate } from "@/entities/ai-candidate/types";
import { Button } from "@/shared/ui/button";
import { useDeckList } from "@/entities/deck/api/deck-queries";

interface CandidateCardProps {
  candidate: AiCardCandidate;
  defaultDeckId?: number;
}

export function CandidateCard({ candidate, defaultDeckId }: CandidateCardProps) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(candidate.question);
  const [answer, setAnswer] = useState(candidate.answer);
  const [explanation, setExplanation] = useState(candidate.explanation ?? "");
  const [deckId, setDeckId] = useState<number | "">(
    candidate.suggested_deck_id ?? defaultDeckId ?? ""
  );

  const { data: decksPage } = useDeckList();
  const adoptMutation = useAdoptCandidate();
  const rejectMutation = useRejectCandidate();
  const restoreMutation = useRestoreCandidate();
  const updateMutation = useUpdateCandidate();

  const isFinal = candidate.status !== "pending";
  const canAdopt = !isFinal && deckId !== "";

  async function handleAdopt() {
    if (deckId === "") {
      toast.error("採用先のデッキを選択してください");
      return;
    }
    try {
      await adoptMutation.mutateAsync({
        id: candidate.id,
        input: {
          deck_id: Number(deckId),
          question,
          answer,
          explanation: explanation.trim() === "" ? null : explanation,
        },
      });
      toast.success("カードとして採用しました");
    } catch {
      toast.error("採用に失敗しました");
    }
  }

  async function handleReject() {
    try {
      await rejectMutation.mutateAsync(candidate.id);
      // Undo トースト (Gmail 風): 一定時間内なら取り消し可能
      toast.success("候補を却下しました", {
        duration: 5000,
        action: {
          label: "元に戻す",
          onClick: async () => {
            try {
              await restoreMutation.mutateAsync(candidate.id);
              toast.success("取り消しました");
            } catch {
              toast.error("取り消しに失敗しました");
            }
          },
        },
      });
    } catch {
      toast.error("却下に失敗しました");
    }
  }

  async function handleSaveEdit() {
    try {
      await updateMutation.mutateAsync({
        id: candidate.id,
        input: {
          question,
          answer,
          explanation: explanation.trim() === "" ? null : explanation,
        },
      });
      toast.success("候補を更新しました");
      setEditing(false);
    } catch {
      toast.error("更新に失敗しました");
    }
  }

  return (
    <article
      className={`border rounded-xl p-4 md:p-5 space-y-3 ${
        candidate.status === "adopted"
          ? "bg-primary/5 border-primary/30"
          : candidate.status === "rejected"
            ? "bg-muted/30 opacity-60"
            : "bg-card"
      }`}
      aria-label={`AI候補 ${candidate.id}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {CARD_TYPE_LABELS[candidate.card_type]}
          </span>
          {candidate.focus_type && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {candidate.focus_type}
            </span>
          )}
          {candidate.confidence !== null && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              信頼度 {(candidate.confidence * 100).toFixed(0)}%
            </span>
          )}
          {candidate.status !== "pending" && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                candidate.status === "adopted"
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive/20 text-destructive"
              }`}
            >
              {candidate.status === "adopted" ? "採用済" : "却下済"}
            </span>
          )}
        </div>
      </header>

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              問題文
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-base md:text-sm resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              回答
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-base md:text-sm resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              補足説明 (任意)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-base md:text-sm resize-y"
              placeholder="[分野タグ] 自分が思い出しやすい具体例など"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              保存
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setQuestion(candidate.question);
                setAnswer(candidate.answer);
                setExplanation(candidate.explanation ?? "");
                setEditing(false);
              }}
            >
              キャンセル
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="font-medium">{question}</p>
          <p className="text-sm text-muted-foreground">{answer}</p>
          {explanation && (
            <p className="text-sm text-muted-foreground border-l-2 border-muted-foreground/30 pl-2 whitespace-pre-wrap">
              {explanation}
            </p>
          )}
          {candidate.rationale && (
            <p className="text-xs text-muted-foreground italic">
              AIの判断: {candidate.rationale}
            </p>
          )}
        </div>
      )}

      {!isFinal && !editing && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <select
            value={deckId}
            onChange={(e) =>
              setDeckId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="border rounded-md px-3 py-2 text-base md:text-sm min-h-11 bg-background sm:flex-1"
            aria-label="採用先のデッキ"
          >
            <option value="">採用先のデッキを選択</option>
            {decksPage?.data.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              type="button"
              size="lg"
              className="min-h-11 flex-1 sm:flex-none"
              onClick={handleAdopt}
              disabled={!canAdopt || adoptMutation.isPending}
              aria-keyshortcuts="a"
            >
              <Check className="size-4" aria-hidden />
              採用
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-11"
              onClick={() => setEditing(true)}
              aria-keyshortcuts="e"
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-11 text-destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              aria-keyshortcuts="r"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
