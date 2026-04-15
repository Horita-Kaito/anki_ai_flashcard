"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useAnswerReview,
  useTodaySession,
} from "../api/review-queries";
import {
  REVIEW_RATINGS,
  REVIEW_RATING_LABELS,
  REVIEW_RATING_SHORTCUTS,
  type ReviewRating,
} from "@/entities/review/types";
import { Button, buttonVariants } from "@/shared/ui/button";

const RATING_CLASSES: Record<ReviewRating, string> = {
  again: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  hard: "bg-amber-500 text-white hover:bg-amber-600",
  good: "bg-emerald-500 text-white hover:bg-emerald-600",
  easy: "bg-sky-500 text-white hover:bg-sky-600",
};

export function ReviewSession() {
  const { data, isLoading, isError, refetch } = useTodaySession();
  const answerMutation = useAnswerReview();

  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

  const cards = data?.cards ?? [];
  const current = cards[index];
  const isDone = !isLoading && cards.length > 0 && index >= cards.length;

  const handleReveal = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!current) return;
      try {
        await answerMutation.mutateAsync({
          card_id: current.id,
          rating,
          response_time_ms: Date.now() - startedAt,
        });
        setCompleted((c) => c + 1);
        setIndex((i) => i + 1);
        setShowAnswer(false);
        setStartedAt(Date.now());
      } catch {
        toast.error("回答の保存に失敗しました");
      }
    },
    [current, answerMutation, startedAt]
  );

  // PC キーボードショートカット
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // input/textarea フォーカス中は無視
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
  }, [showAnswer, handleReveal, handleRate]);

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

  if (!current) return null;

  return (
    <div className="space-y-6">
      {/* 進捗 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {completed} / {cards.length} 完了
        </span>
        <span className="text-muted-foreground">
          残り {cards.length - index} 枚
        </span>
      </div>
      <div
        className="h-1 bg-muted rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={cards.length}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(completed / cards.length) * 100}%` }}
        />
      </div>

      {/* カード */}
      <article className="border rounded-xl p-6 md:p-8 bg-card min-h-[50vh] md:min-h-[40vh] flex flex-col">
        <header className="flex items-center gap-2 mb-4">
          {current.tags?.map((t) => (
            <span
              key={t.id}
              className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {t.name}
            </span>
          ))}
        </header>

        <div className="flex-1 flex flex-col gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              問題
            </p>
            <p className="text-lg md:text-xl whitespace-pre-wrap break-words">
              {current.question}
            </p>
          </div>

          {showAnswer && (
            <div className="pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                答え
              </p>
              <p className="text-base md:text-lg whitespace-pre-wrap break-words">
                {current.answer}
              </p>
              {current.explanation && (
                <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
                  {current.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </article>

      {/* アクション */}
      {!showAnswer ? (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
          <Button
            size="lg"
            className="w-full md:w-auto md:mx-auto md:flex min-h-12 text-base"
            onClick={handleReveal}
          >
            答えを見る{" "}
            <span className="text-xs opacity-70 ml-2 hidden md:inline">
              (Space / Enter)
            </span>
          </Button>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {REVIEW_RATINGS.map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRate(rating)}
                disabled={answerMutation.isPending}
                className={`${RATING_CLASSES[rating]} min-h-14 rounded-md font-medium text-sm md:text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50`}
                aria-keyshortcuts={REVIEW_RATING_SHORTCUTS[rating]}
              >
                <span className="block">{REVIEW_RATING_LABELS[rating]}</span>
                <span className="block text-xs opacity-70">
                  ({REVIEW_RATING_SHORTCUTS[rating]})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
