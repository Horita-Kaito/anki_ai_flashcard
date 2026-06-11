"use client";

import { useEffect, useRef, useState } from "react";
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
import { ClozeText } from "@/shared/ui/cloze-text";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { buildHierarchicalOptions } from "@/shared/lib/deck-tree";

interface CandidateCardProps {
  candidate: AiCardCandidate;
  defaultDeckId?: number;
  ordinal?: number;
  total?: number;
}

const QUALITY_WARNING_LABELS = {
  answer_exposed_in_question: "問題文に答えが含まれている可能性があります",
  answer_too_long: "回答が長いため、分割または短縮を確認してください",
  cloze_answer_mismatch: "穴埋め箇所と回答が一致していません",
  cloze_downgraded_to_basic:
    "穴埋めとして成立しなかったため通常カードに変換されています",
} as const;

export function CandidateCard({
  candidate,
  defaultDeckId,
  ordinal,
  total,
}: CandidateCardProps) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(candidate.question);
  const [answer, setAnswer] = useState(candidate.answer);
  const [explanation, setExplanation] = useState(candidate.explanation ?? "");
  const [deckId, setDeckId] = useState<number | "">(
    candidate.suggested_deck_id ?? defaultDeckId ?? ""
  );

  const { data: allDecks } = useDeckList();
  const deckOptions = buildHierarchicalOptions(allDecks ?? []);
  const adoptMutation = useAdoptCandidate();
  const rejectMutation = useRejectCandidate();
  const restoreMutation = useRestoreCandidate();
  const updateMutation = useUpdateCandidate();

  const isFinal = candidate.status !== "pending";
  const canAdopt = !isFinal && deckId !== "";

  const articleRef = useRef<HTMLElement>(null);

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
      toast.success("カードとして採用しました", {
        duration: 5000,
        description: "採用先デッキへ追加しました。",
      });
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

  // キーボードショートカット: a=採用 / e=編集 / r=却下。
  // このカード (または内部要素) にフォーカスがあるときだけ反応する。
  // 入力欄フォーカス中・修飾キー押下時・確定済み候補・編集中は無効。
  const shortcutRef = useRef<{
    adopt: () => void;
    reject: () => void;
    edit: () => void;
    canAdopt: boolean;
    isFinal: boolean;
    editing: boolean;
  }>(null);
  useEffect(() => {
    shortcutRef.current = {
      adopt: handleAdopt,
      reject: handleReject,
      edit: () => setEditing(true),
      canAdopt,
      isFinal,
      editing,
    };
  });

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const state = shortcutRef.current;
      if (!state) return;
      if (state.isFinal || state.editing) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      const el = articleRef.current;
      const active = document.activeElement as HTMLElement | null;
      // このカード内にフォーカスが無ければ無視
      if (!el || !active || !el.contains(active)) return;

      // 入力中 (input/textarea/contentEditable) は無効化
      const tag = active.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        active.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "a") {
        if (!state.canAdopt) return;
        e.preventDefault();
        state.adopt();
      } else if (key === "e") {
        e.preventDefault();
        state.edit();
      } else if (key === "r") {
        e.preventDefault();
        state.reject();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <article
      ref={articleRef}
      tabIndex={isFinal ? undefined : 0}
      data-candidate-card={isFinal ? undefined : ""}
      className={`border rounded-lg p-4 md:p-5 space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        candidate.status === "adopted"
          ? "bg-[var(--forest-faint)] border-primary/30"
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
          {typeof ordinal === "number" && typeof total === "number" && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--bronze-faint)] text-muted-foreground">
              {ordinal} / {total}
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
        <div className="space-y-3 pb-[env(safe-area-inset-bottom)]">
          <div className="space-y-1.5">
            <label
              htmlFor={`candidate-${candidate.id}-question`}
              className="text-xs font-medium text-muted-foreground"
            >
              問題文
            </label>
            <textarea
              id={`candidate-${candidate.id}-question`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-base md:text-sm resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`candidate-${candidate.id}-answer`}
              className="text-xs font-medium text-muted-foreground"
            >
              回答
            </label>
            <textarea
              id={`candidate-${candidate.id}-answer`}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={2}
              className="w-full border rounded-md px-3 py-2 text-base md:text-sm resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`candidate-${candidate.id}-explanation`}
              className="text-xs font-medium text-muted-foreground"
            >
              補足説明 (任意)
            </label>
            <textarea
              id={`candidate-${candidate.id}-explanation`}
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
        <div className="space-y-3">
          {candidate.quality_warnings.length > 0 && (
            <div
              className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
              role="alert"
            >
              <p className="font-medium">採用前に確認してください</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {candidate.quality_warnings.map((warning) => (
                  <li key={warning}>{QUALITY_WARNING_LABELS[warning]}</li>
                ))}
              </ul>
            </div>
          )}
          {candidate.card_type === "cloze_like" ? (
            <p className="knowledge-text text-lg font-medium leading-relaxed">
              <ClozeText text={question} mode="front" />
            </p>
          ) : (
            <p className="knowledge-text text-lg font-medium leading-relaxed">{question}</p>
          )}
          <p className="knowledge-text text-sm text-muted-foreground">{answer}</p>
          {explanation && (
            <p className="knowledge-text text-sm text-muted-foreground border-l-2 border-[var(--bronze)]/35 pl-3 whitespace-pre-wrap">
              {explanation}
            </p>
          )}
          {candidate.rationale && (
            <details className="rounded-md bg-[var(--bronze-faint)] px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                AI の判断理由
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                {candidate.rationale}
              </p>
            </details>
          )}
        </div>
      )}

      {!isFinal && !editing && (
        <div className="space-y-2 pt-1">
          <select
            value={deckId}
            onChange={(e) =>
              setDeckId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border rounded-md px-3 py-2 text-base md:text-sm min-h-11 bg-background max-w-full"
            aria-label="採用先のデッキ"
          >
            <option value="">採用先のデッキを選択</option>
            {deckOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {"— ".repeat(opt.depth)}
                {truncateDeckName(opt.name)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="lg"
            className="min-h-14 w-full rounded-md text-base"
            onClick={handleAdopt}
            disabled={!canAdopt || adoptMutation.isPending}
            aria-keyshortcuts="a"
          >
            <Check className="size-4" aria-hidden />
            採用して復習に回す
          </Button>
          {deckId === "" && (
            <p className="text-xs text-muted-foreground">
              デッキを選択してから採用できます
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-11"
              onClick={() => setEditing(true)}
              aria-keyshortcuts="e"
            >
              <Pencil className="size-4" aria-hidden />
              編集
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
              却下
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

const MAX_DECK_NAME_LENGTH = 28;

function truncateDeckName(name: string): string {
  return name.length > MAX_DECK_NAME_LENGTH
    ? name.slice(0, MAX_DECK_NAME_LENGTH) + "…"
    : name;
}
