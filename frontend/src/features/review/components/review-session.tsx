"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarClock,
  Check,
  Home,
  Layers,
  NotebookPen,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";
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

const RATING_CLASSES: Record<ReviewRating, string> = {
  again: "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
  hard: "border-[color-mix(in_oklch,var(--persimmon),transparent_45%)] bg-[var(--persimmon-faint)] text-foreground hover:bg-[var(--persimmon-soft)]/60",
  good: "border-primary/35 bg-[var(--forest-faint)] text-primary hover:bg-[var(--forest-soft)]/60",
  easy: "border-[color-mix(in_oklch,var(--bronze),transparent_35%)] bg-[var(--bronze-faint)] text-foreground hover:bg-[var(--bronze-soft)]/70",
};

const RATING_HINTS: Record<ReviewRating, string> = {
  again: "<1分",
  hard: "10分",
  good: "4日",
  easy: "12日",
};

const RATING_DISPLAY_LABELS: Record<ReviewRating, string> = {
  again: "やり直し",
  hard: "難しい",
  good: "思い出せた",
  easy: "簡単すぎ",
};

const RATING_DESCRIPTIONS: Record<ReviewRating, string> = {
  again: "答えられない",
  hard: "迷った・時間がかかった",
  good: "標準の評価",
  easy: "すぐ答えられた",
};

const RATING_BUTTON_CLASSES: Record<ReviewRating, string> = {
  again: "order-3 min-h-14 md:order-1 md:min-h-16",
  hard: "order-1 col-span-2 min-h-20 shadow-sm md:order-2 md:col-span-3 md:min-h-24",
  good: "order-2 col-span-2 min-h-20 shadow-sm md:order-3 md:col-span-3 md:min-h-24",
  easy: "order-4 min-h-14 md:order-4 md:min-h-16",
};

const RATING_LABEL_CLASSES: Record<ReviewRating, string> = {
  again: "text-sm font-semibold leading-tight",
  hard: "text-base font-bold leading-tight md:text-lg",
  good: "text-base font-bold leading-tight md:text-lg",
  easy: "text-sm font-semibold leading-tight",
};

function ReviewExitBar() {
  return (
    <nav
      aria-label="復習を中断して移動"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
    >
      <span className="text-xs font-medium text-muted-foreground">
        復習を中断
      </span>
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Home className="size-4" aria-hidden />
          <span>ホーム</span>
        </Link>
        <Link
          href="/notes"
          className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <NotebookPen className="size-4" aria-hidden />
          <span>メモ</span>
        </Link>
        <Link
          href="/cards"
          className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Layers className="size-4" aria-hidden />
          <span>カード</span>
        </Link>
      </div>
    </nav>
  );
}

export function ReviewSession() {
  const todaySession = useTodaySession();
  const { data, isError, refetch } = todaySession;
  // gcTime (10分) で残った前回セッションのキャッシュが一瞬表示されて
  // 別カードがチラつく現象を抑止する。マウント後の初回 fetch 完了 (=画面の
  // データが「今この瞬間」の状態と確実に一致) までは読み込み中扱い。
  // isLoading は data===undefined の時しか true にならないため、cache 有無に
  // 関わらず「初回 fetch を待つ」を表現できる isFetchedAfterMount を使う。
  const isInitialLoading = !todaySession.isFetchedAfterMount && !isError;
  const answerMutation = useAnswerReview();
  const archiveMutation = useArchiveFromReview();

  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());

  const [extraMode, setExtraMode] = useState(false);
  const [extraIndex, setExtraIndex] = useState(0);
  const [extraCompleted, setExtraCompleted] = useState(0);

  const extraSession = useExtraSession(extraMode);
  const { data: extraData } = extraSession;
  const isExtraInitialLoading =
    extraMode && !extraSession.isFetchedAfterMount && !extraSession.isError;

  const cards = data?.cards ?? [];
  const extraCards: ExtraCard[] = extraData?.cards ?? [];

  const activeCards = extraMode ? extraCards : cards;
  const activeIndex = extraMode ? extraIndex : index;
  const activeCompleted = extraMode ? extraCompleted : completed;

  const current = activeCards[activeIndex];
  const currentExtraCard = extraMode ? (current as ExtraCard | undefined) : undefined;
  const isDone =
    !isInitialLoading && cards.length > 0 && index >= cards.length && !extraMode;
  const isExtraDone =
    extraMode &&
    !isExtraInitialLoading &&
    extraCards.length > 0 &&
    extraIndex >= extraCards.length;

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

  if (isInitialLoading) {
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

  if (isExtraInitialLoading) {
    return (
      <p className="text-center text-muted-foreground py-20">読み込み中...</p>
    );
  }

  if (extraMode && extraCards.length === 0 && !isExtraInitialLoading) {
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
    <div className="space-y-5">
      <ReviewExitBar />

      {extraMode && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--bronze-faint)] border border-[color-mix(in_oklch,var(--bronze),transparent_55%)] px-4 py-2 text-sm font-medium text-muted-foreground">
          <CalendarClock className="size-4" aria-hidden />
          閲覧モード — スケジュールには影響しません
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
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

      <div className="flex justify-end gap-2">
        <Link
          href={`/cards/${current.id}?next=/review`}
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} min-h-11 text-muted-foreground`}
        >
          <Pencil className="size-4 mr-1" aria-hidden />
          編集
        </Link>
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
        <div className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] border-t bg-background/95 backdrop-blur z-30 p-3 md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
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
        <div className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] border-t bg-background/95 backdrop-blur z-30 p-3 md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
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
        <div className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] border-t bg-background/95 backdrop-blur z-30 p-3 md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0 md:pb-0">
          <div className="mx-auto grid max-w-3xl grid-cols-4 gap-2 md:grid-cols-8">
            {REVIEW_RATINGS.map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRate(rating)}
                disabled={answerMutation.isPending}
                className={`${RATING_CLASSES[rating]} ${RATING_BUTTON_CLASSES[rating]} rounded-md border px-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50`}
                aria-keyshortcuts={REVIEW_RATING_SHORTCUTS[rating]}
                aria-label={`${REVIEW_RATING_LABELS[rating]}、${RATING_DESCRIPTIONS[rating]}、次回 ${RATING_HINTS[rating]}`}
              >
                <span className={`block ${RATING_LABEL_CLASSES[rating]}`}>
                  {RATING_DISPLAY_LABELS[rating]}
                </span>
                <span className="mt-1 block text-[11px] leading-tight opacity-80 md:text-xs">
                  {RATING_DESCRIPTIONS[rating]}
                </span>
                <span className="mt-1 block text-[11px] leading-tight opacity-80">
                  {RATING_HINTS[rating]}
                </span>
                <kbd className="mt-1 inline-flex rounded bg-card/70 px-1.5 py-0.5 text-[10px] opacity-75 md:mt-2">
                  {REVIEW_RATING_SHORTCUTS[rating]}
                </kbd>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
