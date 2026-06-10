"use client";

import { useEffect, useRef } from "react";
import { BatchAdoptBar } from "./batch-adopt-bar";
import { CandidateCard } from "./candidate-card";
import type { AiCardCandidate } from "@/entities/ai-candidate/types";

interface CandidateReviewListProps {
  candidates: AiCardCandidate[];
  defaultDeckId?: number;
  idPrefix?: string;
  showHistory?: boolean;
  emptyMessage?: string;
}

export function CandidateReviewList({
  candidates,
  defaultDeckId,
  idPrefix = "candidate-review",
  showHistory = true,
  emptyMessage = "レビュー待ち候補はありません。",
}: CandidateReviewListProps) {
  const pendingCandidates = candidates.filter((candidate) => candidate.status === "pending");
  const historyCandidates = candidates.filter((candidate) => candidate.status !== "pending");

  // j/k で未採用候補カード間のフォーカスを移動する。
  // 入力欄フォーカス中・修飾キー押下時は無効。
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key !== "j" && key !== "k") return;

      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          active.isContentEditable
        ) {
          return;
        }
      }

      const root = containerRef.current;
      if (!root) return;
      const cards = Array.from(
        root.querySelectorAll<HTMLElement>("[data-candidate-card]")
      );
      if (cards.length === 0) return;

      const currentIndex = cards.findIndex(
        (c) => active && (c === active || c.contains(active))
      );
      let nextIndex: number;
      if (currentIndex === -1) {
        nextIndex = 0;
      } else if (key === "j") {
        nextIndex = Math.min(currentIndex + 1, cards.length - 1);
      } else {
        nextIndex = Math.max(currentIndex - 1, 0);
      }
      e.preventDefault();
      cards[nextIndex]?.focus();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (candidates.length === 0 || (pendingCandidates.length === 0 && !showHistory)) {
    return (
      <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-5" ref={containerRef}>
      {pendingCandidates.length > 0 && (
        <section aria-labelledby={`${idPrefix}-pending`} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${idPrefix}-pending`} className="font-medium">
              未採用候補 ({pendingCandidates.length})
            </h2>
            <BatchAdoptBar candidateIds={pendingCandidates.map((candidate) => candidate.id)} />
          </div>
          <p className="hidden text-xs text-muted-foreground md:block">
            ショートカット: j / k で移動、a 採用 / e 編集 / r 却下
          </p>
          <div className="space-y-3">
            {pendingCandidates.map((candidate, index) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                defaultDeckId={defaultDeckId}
                ordinal={index + 1}
                total={pendingCandidates.length}
              />
            ))}
          </div>
        </section>
      )}

      {showHistory && historyCandidates.length > 0 && (
        <section aria-labelledby={`${idPrefix}-history`} className="space-y-3">
          <h2
            id={`${idPrefix}-history`}
            className="text-sm font-medium text-muted-foreground"
          >
            履歴 ({historyCandidates.length})
          </h2>
          <div className="space-y-3">
            {historyCandidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
