"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Archive, CalendarClock, Check, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useAnswerReview,
  useArchiveFromReview,
  useExtraSession,
  useTodaySession,
} from "../api/review-queries";
import { ReviewCardFlip } from "./review-card-flip";
import {
  REVIEW_RATINGS,
  REVIEW_RATING_LABELS,
  REVIEW_RATING_SHORTCUTS,
  type ReviewRating,
} from "@/entities/review/types";
import type { ExtraCard } from "@/entities/review/types";
import { Button, buttonVariants } from "@/shared/ui/button";
import { haptic } from "@/shared/lib/haptics";

// メイン (hard / good) は大きく強調。サブ (again / easy) は控えめ。
// アルゴリズムを知らないユーザーが基本の 2 択をすぐ見つけられるようにする。
const RATING_CLASSES_PRIMARY: Record<"hard" | "good", string> = {
  hard: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
  good: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
};

const RATING_CLASSES_SECONDARY: Record<"again" | "easy", string> = {
  again:
    "bg-background border border-destructive/40 text-destructive hover:bg-destructive/10",
  easy: "bg-background border border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10",
};

const RATING_HINTS: Record<ReviewRating, string> = {
  again: "思い出せなかった",
  hard: "時間がかかった",
  good: "スムーズに思い出せた",
  easy: "余裕だった",
};

export function ReviewSession() {
  const { data, isLoading, isError, refetch } = useTodaySession();
  const answerMutation = useAnswerReview();
  const archiveMutation = useArchiveFromReview();

  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

  const [extraMode, setExtraMode] = useState(false);
  const [extraIndex, setExtraIndex] = useState(0);
  const [extraCompleted, setExtraCompleted] = useState(0);

  const {
    data: extraData,
    isLoading: extraLoading,
  } = useExtraSession(extraMode);

  const cards = data?.cards ?? [];
  const extraCards: ExtraCard[] = extraData?.cards ?? [];

  const activeCards = extraMode ? extraCards : cards;
  const activeIndex = extraMode ? extraIndex : index;
  const activeCompleted = extraMode ? extraCompleted : completed;

  const current = activeCards[activeIndex];
  const currentExtraCard = extraMode ? (current as ExtraCard | undefined) : undefined;
  const isDone = !isLoading && cards.length > 0 && index >= cards.length && !extraMode;
  const isExtraDone = extraMode && !extraLoading && extraCards.length > 0 && extraIndex >= extraCards.length;

  const handleReveal = useCallback(() => {
    setShowAnswer(true);
  }, []);

  // mutateAsync を ref に固定し、useCallback の依存変動を抑える
  const answerMutateRef = useRef(answerMutation.mutateAsync);
  answerMutateRef.current = answerMutation.mutateAsync;
  // 連打 / キーボード連打のガード (mutation.isPending では不十分: state更新前の連続呼び出しを止める)
  const isSubmittingRef = useRef(false);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!current) return;
      if (isSubmittingRef.current || answerMutation.isPending) return;
      isSubmittingRef.current = true;
      // タブ放置 / 時計操作対策: response_time を 5 分でクランプ
      const elapsed = Math.min(Math.max(Date.now() - startedAt, 0), 5 * 60 * 1000);
      try {
        await answerMutateRef.current({
          card_id: current.id,
          rating,
          response_time_ms: elapsed,
        });
        haptic("success");
        setCompleted((c) => c + 1);
        setIndex((i) => i + 1);
        setShowAnswer(false);
        setStartedAt(Date.now());
      } catch {
        haptic("warning");
        toast.error("回答の保存に失敗しました");
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [current, answerMutation.isPending, startedAt]
  );

  const handleNextExtra = useCallback(() => {
    haptic("light");
    setExtraCompleted((c) => c + 1);
    setExtraIndex((i) => i + 1);
    setShowAnswer(false);
  }, []);

  // PC キーボードショートカット
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (!showAnswer && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        handleReveal();
        return;
      }
      if (!showAnswer) return;

      if (extraMode) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleNextExtra();
        }
        return;
      }

      const rating = REVIEW_RATINGS.find(
        (r) => REVIEW_RATING_SHORTCUTS[r] === e.key
      );
      if (rating) {
        e.preventDefault();
        handleRate(rating);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showAnswer, handleReveal, handleRate, handleNextExtra, extraMode]);

  if (isLoading) {
    return (
      <p className="text-center text-muted-foreground py-20">読み込み中...</p>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="text-center space-y-3 py-10">
        <p className="text-destructive">読み込みに失敗しました</p>
        <Button onClick={() => refetch()} size="lg" className="min-h-11">
          再試行
        </Button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 border border-dashed rounded-xl p-8 text-center">
        <Sparkles className="size-8 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">今日の復習は完了しています</p>
          <p className="text-sm text-muted-foreground">
            明日また戻ってきてください
          </p>
        </div>
        <Link
          href="/dashboard"
          className={`${buttonVariants({ variant: "outline", size: "lg" })} min-h-11`}
        >
          ダッシュボードへ
        </Link>
      </div>
    );
  }

  if (isExtraDone) {
    return (
      <div className="flex flex-col items-center gap-4 border rounded-xl p-8 text-center bg-primary/5">
        <Sparkles className="size-10 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-xl font-semibold">すべてのカードを復習しました！</p>
          <p className="text-sm text-muted-foreground">
            {completed + extraCompleted} 枚のカードを復習しました（追加 {extraCompleted} 枚）
          </p>
        </div>
        <Link
          href="/dashboard"
          className={`${buttonVariants({ size: "lg" })} min-h-11`}
        >
          ダッシュボードへ
        </Link>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-4 border rounded-xl p-8 text-center bg-primary/5">
        <Check className="size-10 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-xl font-semibold">お疲れさまでした</p>
          <p className="text-sm text-muted-foreground">
            {completed} 枚のカードを復習しました
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/dashboard"
            className={`${buttonVariants({ size: "lg" })} min-h-11`}
          >
            ダッシュボードへ
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="min-h-11"
            onClick={() => {
              setExtraMode(true);
              setExtraIndex(0);
              setExtraCompleted(0);
              setShowAnswer(false);
            }}
          >
            <CalendarClock className="size-4" aria-hidden />
            もっと続ける
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="min-h-11"
            onClick={() => {
              setIndex(0);
              setCompleted(0);
              setShowAnswer(false);
              refetch();
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
            もう一度取得
          </Button>
        </div>
      </div>
    );
  }

  if (extraMode && extraLoading) {
    return (
      <p className="text-center text-muted-foreground py-20">読み込み中...</p>
    );
  }

  if (extraMode && extraCards.length === 0 && !extraLoading) {
    return (
      <div className="flex flex-col items-center gap-4 border rounded-xl p-8 text-center bg-primary/5">
        <Sparkles className="size-10 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-xl font-semibold">すべてのカードを復習しました！</p>
          <p className="text-sm text-muted-foreground">
            追加で復習できるカードはありません
          </p>
        </div>
        <Link
          href="/dashboard"
          className={`${buttonVariants({ size: "lg" })} min-h-11`}
        >
          ダッシュボードへ
        </Link>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="space-y-6">
      {extraMode && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          <CalendarClock className="size-4" aria-hidden />
          閲覧モード — スケジュールには影響しません
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {activeCompleted} / {activeCards.length} 完了
        </span>
        <span className="text-muted-foreground">
          残り {activeCards.length - activeIndex} 枚
        </span>
      </div>
      <div
        className="h-1 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={activeCompleted}
        aria-valuemin={0}
        aria-valuemax={activeCards.length}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${activeCards.length > 0 ? (activeCompleted / activeCards.length) * 100 : 0}%` }}
        />
      </div>

      {currentExtraCard && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            📅 {currentExtraCard.days_until_due}日後に出題予定
          </span>
        </div>
      )}

      {/* アーカイブボタン */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 text-muted-foreground"
          disabled={archiveMutation.isPending || answerMutation.isPending}
          onClick={() => {
            archiveMutation.mutate(current.id, {
              onSuccess: () => {
                haptic("success");
                toast.success("カードをアーカイブしました");
                if (extraMode) {
                  setExtraCompleted((c) => c + 1);
                  setExtraIndex((i) => i + 1);
                } else {
                  setCompleted((c) => c + 1);
                  setIndex((i) => i + 1);
                }
                setShowAnswer(false);
                setStartedAt(Date.now());
              },
              onError: () => {
                haptic("warning");
                toast.error("アーカイブに失敗しました");
              },
            });
          }}
        >
          <Archive className="size-4 mr-1" aria-hidden />
          アーカイブ
        </Button>
      </div>

      <ReviewCardFlip
        card={current}
        showAnswer={showAnswer}
        onReveal={handleReveal}
        disabled={answerMutation.isPending}
      />

      {!showAnswer ? (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-30 p-3 md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
          <Button
            size="lg"
            className="w-full md:w-auto md:mx-auto md:flex min-h-12 text-base"
            onClick={handleReveal}
          >
            {extraMode ? "確認する" : "答えを見る"}{" "}
            <span className="text-xs opacity-70 ml-2 hidden md:inline">
              (Space / Enter)
            </span>
          </Button>
        </div>
      ) : extraMode ? (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-30 p-3 md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
          <Button
            size="lg"
            className="w-full md:w-auto md:mx-auto md:flex min-h-12 text-base"
            onClick={handleNextExtra}
          >
            次へ{" "}
            <span className="text-xs opacity-70 ml-2 hidden md:inline">
              (Space / Enter)
            </span>
          </Button>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-30 p-3 md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
          <div className="space-y-2">
            {/* 基本の 2 択: 「難しい」と「普通」を大きく */}
            <div className="grid grid-cols-2 gap-2">
              {(["hard", "good"] as const).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRate(rating)}
                  disabled={answerMutation.isPending}
                  className={`${RATING_CLASSES_PRIMARY[rating]} min-h-16 rounded-md font-semibold text-base md:text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 px-3`}
                  aria-keyshortcuts={REVIEW_RATING_SHORTCUTS[rating]}
                >
                  <span className="block leading-tight">
                    {REVIEW_RATING_LABELS[rating]}
                  </span>
                  <span className="block text-[11px] md:text-xs font-normal opacity-90 leading-tight mt-0.5">
                    {RATING_HINTS[rating]}
                  </span>
                  <span className="block text-[10px] md:text-xs opacity-70 leading-tight mt-0.5">
                    ({REVIEW_RATING_SHORTCUTS[rating]})
                  </span>
                </button>
              ))}
            </div>
            {/* 補助の 2 択: 「もう一度」と「簡単」は控えめに */}
            <div className="grid grid-cols-2 gap-2">
              {(["again", "easy"] as const).map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRate(rating)}
                  disabled={answerMutation.isPending}
                  className={`${RATING_CLASSES_SECONDARY[rating]} min-h-11 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 px-3`}
                  aria-keyshortcuts={REVIEW_RATING_SHORTCUTS[rating]}
                >
                  <span className="font-medium">
                    {REVIEW_RATING_LABELS[rating]}
                  </span>
                  <span className="text-xs opacity-70 ml-1.5">
                    ({REVIEW_RATING_SHORTCUTS[rating]})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
