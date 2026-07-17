"use client";

import { Button } from "@/shared/ui/button";
import {
  REVIEW_RATINGS,
  REVIEW_RATING_LABELS,
  REVIEW_RATING_SHORTCUTS,
  type ReviewRating,
} from "@/entities/review/types";
import {
  RATING_BUTTON_CLASSES,
  RATING_DESCRIPTIONS,
  RATING_DISPLAY_LABELS,
} from "./review-rating-config";

interface ReviewActionBarProps {
  showAnswer: boolean;
  extraMode: boolean;
  disabled: boolean;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
  onNextExtra: () => void;
}

const BAR_WRAPPER =
  "absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pt-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3";

/**
 * 画面下部に固定される復習アクションバー。
 * - 答え表示前: 大きな主 CTA「答えを見る」
 * - 追加(閲覧)モードで答え表示後:「次へ」
 * - 通常モードで答え表示後: 4 段階評価ボタン
 */
export function ReviewActionBar({
  showAnswer,
  extraMode,
  disabled,
  onReveal,
  onRate,
  onNextExtra,
}: ReviewActionBarProps) {
  if (!showAnswer) {
    return (
      <div className={BAR_WRAPPER}>
        <div className="mx-auto max-w-2xl">
          <Button
            size="touch"
            className="min-h-14 w-full text-base"
            onClick={onReveal}
          >
            {extraMode ? "確認する" : "答えを見る"}
            <kbd className="ml-2 hidden rounded bg-primary-foreground/15 px-1.5 py-0.5 text-[11px] font-normal opacity-90 md:inline-flex">
              Space
            </kbd>
          </Button>
        </div>
      </div>
    );
  }

  if (extraMode) {
    return (
      <div className={BAR_WRAPPER}>
        <div className="mx-auto max-w-2xl">
          <Button
            size="touch"
            className="min-h-14 w-full text-base"
            onClick={onNextExtra}
          >
            次へ
            <kbd className="ml-2 hidden rounded bg-primary-foreground/15 px-1.5 py-0.5 text-[11px] font-normal opacity-90 md:inline-flex">
              Space
            </kbd>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={BAR_WRAPPER}>
      <div className="mx-auto max-w-2xl space-y-1.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REVIEW_RATINGS.map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onRate(rating)}
              disabled={disabled}
              aria-keyshortcuts={REVIEW_RATING_SHORTCUTS[rating]}
              aria-label={`${REVIEW_RATING_LABELS[rating]}、${RATING_DESCRIPTIONS[rating]}`}
              className={`${RATING_BUTTON_CLASSES[rating]} flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50`}
            >
              <span className="block max-w-full truncate text-sm font-bold leading-tight md:text-base">
                {RATING_DISPLAY_LABELS[rating]}
              </span>
              <span className="block text-[11px] leading-tight opacity-75">
                {RATING_DESCRIPTIONS[rating]}
              </span>
            </button>
          ))}
        </div>
        <p className="hidden justify-center gap-3 text-center text-[11px] text-muted-foreground md:flex">
          {REVIEW_RATINGS.map((rating) => (
            <span key={rating} className="inline-flex items-center gap-1">
              <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">
                {REVIEW_RATING_SHORTCUTS[rating]}
              </kbd>
              {RATING_DISPLAY_LABELS[rating]}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
