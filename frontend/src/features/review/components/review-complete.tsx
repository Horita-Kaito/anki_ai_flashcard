"use client";

import Link from "next/link";
import { CalendarClock, NotebookPen, RotateCcw, Sparkles } from "lucide-react";
import { REVIEW_RATINGS, type ReviewRating } from "@/entities/review/types";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  RATING_DISPLAY_LABELS,
  RATING_SUMMARY_CLASSES,
} from "./review-rating-config";

interface ReviewCompleteProps {
  completed: number;
  ratingCounts: Record<ReviewRating, number>;
  onStartExtra: () => void;
  onRetake: () => void;
}

/**
 * 今日の通常復習を終えたときの称賛サマリー画面。
 * 過度な演出は避け、成果 (枚数・評価内訳) と次の一歩だけを提示する。
 */
export function ReviewComplete({
  completed,
  ratingCounts,
  onStartExtra,
  onRetake,
}: ReviewCompleteProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center py-6">
      <Card className="w-full text-center">
        <CardContent className="flex flex-col items-center gap-4 p-6 pt-6 md:p-8 md:pt-8">
          <div
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full bg-[var(--forest-faint)] text-[var(--forest)]"
          >
            <Sparkles className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-semibold">お疲れさまでした</p>
            <p className="text-sm text-muted-foreground">
              {completed} 枚のカードを復習しました
            </p>
          </div>

          {completed > 0 && (
            <dl className="grid w-full grid-cols-4 gap-2">
              {REVIEW_RATINGS.map((rating) => (
                <div
                  key={rating}
                  className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 ${RATING_SUMMARY_CLASSES[rating]}`}
                >
                  <dd className="text-lg font-bold tabular-nums">
                    {ratingCounts[rating]}
                  </dd>
                  <dt className="text-[11px] font-medium leading-tight">
                    {RATING_DISPLAY_LABELS[rating]}
                  </dt>
                </div>
              ))}
            </dl>
          )}

          <div className="flex w-full flex-col gap-2 pt-1">
            <Button size="touch" className="w-full" onClick={onStartExtra}>
              <CalendarClock data-icon="inline-start" aria-hidden />
              追加で復習する
            </Button>
            <Link
              href="/notes/new"
              className={`${buttonVariants({ variant: "outline", size: "touch" })} w-full`}
            >
              <NotebookPen data-icon="inline-start" aria-hidden />
              メモを書く
            </Link>
            <Link
              href="/dashboard"
              className={`${buttonVariants({ variant: "ghost", size: "touch" })} w-full`}
            >
              ダッシュボードへ
            </Link>
          </div>

          <button
            type="button"
            onClick={onRetake}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            もう一度取得
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

interface ReviewExtraCompleteProps {
  /** 通常 + 追加を合わせた総復習枚数 */
  totalReviewed: number;
  extraCompleted: number;
  /** 追加できるカードが無かった場合 true */
  emptyExtra?: boolean;
}

/**
 * 追加(閲覧)モードを終えた / 追加対象が無かったときの締め画面。
 */
export function ReviewExtraComplete({
  totalReviewed,
  extraCompleted,
  emptyExtra,
}: ReviewExtraCompleteProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center py-6">
      <Card className="w-full text-center">
        <CardContent className="flex flex-col items-center gap-4 p-6 pt-6 md:p-8 md:pt-8">
          <div
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full bg-[var(--forest-faint)] text-[var(--forest)]"
          >
            <Sparkles className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-semibold">すべてのカードを復習しました</p>
            <p className="text-sm text-muted-foreground">
              {emptyExtra
                ? "追加で復習できるカードはありません"
                : `${totalReviewed} 枚を復習しました（追加 ${extraCompleted} 枚）`}
            </p>
          </div>
          <Link
            href="/dashboard"
            className={`${buttonVariants({ size: "touch" })} w-full`}
          >
            ダッシュボードへ
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
