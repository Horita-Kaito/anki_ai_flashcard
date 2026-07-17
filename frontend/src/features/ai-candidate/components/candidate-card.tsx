"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import {
  useAdoptCandidate,
  useRejectCandidate,
  useRestoreCandidate,
  useUpdateCandidate,
} from "../api/ai-candidate-queries";
import { CandidateCardEditor } from "./candidate-card-editor";
import { CARD_TYPE_LABELS } from "@/entities/card/types";
import type { AiCardCandidate } from "@/entities/ai-candidate/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ClozeText } from "@/shared/ui/cloze-text";
import { NativeSelect } from "@/shared/ui/select";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { buildHierarchicalOptions } from "@/shared/lib/deck-tree";

interface CandidateCardProps {
  candidate: AiCardCandidate;
  defaultDeckId?: number;
  ordinal?: number;
  total?: number;
  /** ユーザーがデッキを選択/採用した時に呼ばれる。リスト側で sticky デフォルトを共有するため。 */
  onDeckChosen?: (deckId: number) => void;
}

const QUALITY_WARNING_LABELS = {
  answer_exposed_in_question: "問題文に答えが含まれている可能性があります",
  answer_too_long: "回答が長いため、分割または短縮を確認してください",
  cloze_answer_mismatch: "穴埋め箇所と回答が一致していません",
  cloze_downgraded_to_basic:
    "穴埋めとして成立しなかったため通常カードに変換されています",
} as const;

const MAX_DECK_NAME_LENGTH = 28;

function truncateDeckName(name: string): string {
  return name.length > MAX_DECK_NAME_LENGTH
    ? name.slice(0, MAX_DECK_NAME_LENGTH) + "…"
    : name;
}

export function CandidateCard({
  candidate,
  defaultDeckId,
  ordinal,
  total,
  onDeckChosen,
}: CandidateCardProps) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(candidate.question);
  const [answer, setAnswer] = useState(candidate.answer);
  const [explanation, setExplanation] = useState(candidate.explanation ?? "");
  // null = 未操作。未操作の間は suggested → sticky デフォルトの順に自動追従し、
  // 一度でも手で選んだらその値を優先する。
  const [selectedDeckId, setSelectedDeckId] = useState<number | "" | null>(
    null
  );

  const { data: allDecks } = useDeckList();
  const deckOptions = buildHierarchicalOptions(allDecks ?? []);
  // 削除済みデッキ id が localStorage に残っていた場合に備えて実在チェック
  const validDefaultDeckId =
    defaultDeckId !== undefined &&
    (allDecks ?? []).some((deck) => deck.id === defaultDeckId)
      ? defaultDeckId
      : undefined;
  const deckId: number | "" =
    selectedDeckId ?? candidate.suggested_deck_id ?? validDefaultDeckId ?? "";
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
      onDeckChosen?.(Number(deckId));
      toast.success("カードとして採用しました", {
        duration: 5000,
        description: "採用先デッキへ追加しました。",
      });
    } catch {
      toast.error("採用に失敗しました");
    }
  }

  async function handleRestore() {
    try {
      await restoreMutation.mutateAsync(candidate.id);
      toast.success("取り消しました");
    } catch {
      toast.error("取り消しに失敗しました");
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
          onClick: () => {
            void handleRestore();
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
      className={`space-y-4 rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-5 ${
        candidate.status === "adopted"
          ? "border-[color-mix(in_oklch,var(--forest),transparent_70%)] bg-[var(--forest-faint)]"
          : candidate.status === "rejected"
            ? "bg-muted/40 opacity-70"
            : "bg-card"
      }`}
      aria-label={`AI候補 ${candidate.id}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{CARD_TYPE_LABELS[candidate.card_type]}</Badge>
        {typeof ordinal === "number" && typeof total === "number" && (
          <Badge variant="outline">
            {ordinal} / {total}
          </Badge>
        )}
        {candidate.status === "adopted" && (
          <Badge variant="success" className="ml-auto">
            <Check aria-hidden />
            採用済
          </Badge>
        )}
        {candidate.status === "rejected" && (
          <Badge variant="secondary" className="ml-auto">
            却下済
          </Badge>
        )}
      </header>

      {editing ? (
        <CandidateCardEditor
          candidateId={candidate.id}
          question={question}
          answer={answer}
          explanation={explanation}
          onQuestionChange={setQuestion}
          onAnswerChange={setAnswer}
          onExplanationChange={setExplanation}
          onSave={handleSaveEdit}
          onCancel={() => {
            setQuestion(candidate.question);
            setAnswer(candidate.answer);
            setExplanation(candidate.explanation ?? "");
            setEditing(false);
          }}
          saving={updateMutation.isPending}
        />
      ) : (
        <div className="space-y-3">
          {candidate.quality_warnings.length > 0 && (
            <div
              className="rounded-lg border border-[var(--bronze)]/40 bg-[var(--bronze-faint)] px-3 py-2 text-xs text-foreground"
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
          {/* 問題文を主役に大きく、回答はその下に控えめに */}
          {candidate.card_type === "cloze_like" ? (
            <p className="knowledge-text text-lg font-medium leading-relaxed">
              <ClozeText text={question} mode="front" />
            </p>
          ) : (
            <p className="knowledge-text text-lg font-medium leading-relaxed">
              {question}
            </p>
          )}
          <p className="knowledge-text border-l-2 border-[var(--forest)]/30 pl-3 text-sm text-muted-foreground">
            {answer}
          </p>
          {explanation && (
            <p className="knowledge-text whitespace-pre-wrap border-l-2 border-[var(--bronze)]/35 pl-3 text-sm text-muted-foreground">
              {explanation}
            </p>
          )}
          {/* メタ情報 (focus type / 信頼度 / AI 判断理由) は控えめに */}
          <div className="flex flex-wrap items-center gap-1.5">
            {candidate.focus_type && (
              <Badge variant="secondary">{candidate.focus_type}</Badge>
            )}
            {candidate.confidence !== null && (
              <Badge variant="outline">
                信頼度 {(candidate.confidence * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
          {candidate.rationale && (
            <details className="rounded-lg bg-[var(--bronze-faint)] px-3 py-2">
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
          <NativeSelect
            value={deckId}
            onChange={(e) => {
              const next = e.target.value === "" ? "" : Number(e.target.value);
              setSelectedDeckId(next);
              if (next !== "") onDeckChosen?.(next);
            }}
            aria-label="採用先のデッキ"
          >
            <option value="">採用先のデッキを選択</option>
            {deckOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {"— ".repeat(opt.depth)}
                {truncateDeckName(opt.name)}
              </option>
            ))}
          </NativeSelect>
          {/* 採用が primary。SP では親指の届くカード下部に大きく配置 */}
          <Button
            type="button"
            size="touch"
            className="min-h-14 w-full text-base"
            onClick={handleAdopt}
            disabled={!canAdopt || adoptMutation.isPending}
            aria-keyshortcuts="a"
          >
            <Check aria-hidden />
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
              size="touch"
              variant="outline"
              onClick={() => setEditing(true)}
              aria-keyshortcuts="e"
            >
              <Pencil aria-hidden />
              編集
            </Button>
            <Button
              type="button"
              size="touch"
              variant="ghost"
              className="text-destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              aria-keyshortcuts="r"
            >
              <X aria-hidden />
              却下
            </Button>
          </div>
        </div>
      )}

      {/* 却下済みは取り消し導線を残す (Undo トーストが消えても復帰できる) */}
      {candidate.status === "rejected" && (
        <div className="pt-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRestore}
            disabled={restoreMutation.isPending}
          >
            <RotateCcw aria-hidden />
            却下を取り消す
          </Button>
        </div>
      )}
    </article>
  );
}
