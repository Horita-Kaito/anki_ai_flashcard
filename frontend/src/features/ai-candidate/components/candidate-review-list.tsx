"use client";

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

  if (candidates.length === 0 || (pendingCandidates.length === 0 && !showHistory)) {
    return (
      <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {pendingCandidates.length > 0 && (
        <section aria-labelledby={`${idPrefix}-pending`} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id={`${idPrefix}-pending`} className="font-medium">
              未採用候補 ({pendingCandidates.length})
            </h2>
            <BatchAdoptBar candidateIds={pendingCandidates.map((candidate) => candidate.id)} />
          </div>
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
