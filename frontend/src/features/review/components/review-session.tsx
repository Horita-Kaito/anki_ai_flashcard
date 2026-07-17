"use client";

import { ReviewCardFlip } from "./review-card-flip";
import { ReviewHeader } from "./review-header";
import { ReviewActionBar } from "./review-action-bar";
import { ReviewComplete, ReviewExtraComplete } from "./review-complete";
import { ReviewEmpty } from "./review-empty";
import { useReviewSession } from "./use-review-session";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorState } from "@/shared/ui/error-state";

interface ReviewSessionProps {
  /** 指定するとこのデッキ (子孫含む) の due カードのみ出題する集中復習モード */
  deckId?: number;
}

export function ReviewSession({ deckId }: ReviewSessionProps = {}) {
  const s = useReviewSession(deckId);

  if (s.isInitialLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 py-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
    );
  }

  if (s.isError) {
    return <ErrorState onRetry={() => s.refetch()} className="my-8" />;
  }

  if (s.cardCount === 0) {
    return (
      <ReviewEmpty
        hasCards={s.hasCards}
        isDeckScoped={deckId !== undefined}
        deckName={s.scopedDeck?.name}
      />
    );
  }

  if (s.isExtraDone) {
    return (
      <ReviewExtraComplete
        totalReviewed={s.completed + s.extraCompleted}
        extraCompleted={s.extraCompleted}
      />
    );
  }

  if (s.isDone) {
    return (
      <ReviewComplete
        completed={s.completed}
        ratingCounts={s.ratingCounts}
        onStartExtra={s.startExtra}
        onRetake={s.retake}
      />
    );
  }

  if (s.isExtraInitialLoading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 py-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (s.extraMode && s.extraCardCount === 0) {
    return (
      <ReviewExtraComplete
        totalReviewed={s.completed}
        extraCompleted={s.extraCompleted}
        emptyExtra
      />
    );
  }

  if (!s.current) return null;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <ReviewHeader
        completed={s.activeCompleted}
        total={s.activeCards.length}
        remaining={s.activeCards.length - s.activeIndex}
        currentCardId={s.current.id}
        onArchive={s.handleArchive}
        archiveDisabled={s.archivePending || s.answerPending}
        deckName={s.scopedDeck?.name}
        isDeckScoped={deckId !== undefined}
        extraMode={s.extraMode}
        daysUntilDue={s.currentExtraCard?.days_until_due}
      />

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="mx-auto max-w-2xl pb-40 md:pb-44">
            <ReviewCardFlip
              card={s.current}
              showAnswer={s.showAnswer}
              onReveal={s.handleReveal}
              disabled={s.answerPending}
            />
          </div>
        </div>
      </div>

      <ReviewActionBar
        showAnswer={s.showAnswer}
        extraMode={s.extraMode}
        disabled={s.answerPending}
        onReveal={s.handleReveal}
        onRate={s.handleRate}
        onNextExtra={s.handleNextExtra}
      />
    </div>
  );
}
