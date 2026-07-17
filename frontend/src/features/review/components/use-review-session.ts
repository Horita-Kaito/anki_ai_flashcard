"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAnswerReview,
  useArchiveFromReview,
  useExtraSession,
  useTodaySession,
} from "../api/review-queries";
import {
  REVIEW_RATINGS,
  REVIEW_RATING_SHORTCUTS,
  type ExtraCard,
  type ReviewRating,
} from "@/entities/review/types";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { haptic } from "@/shared/lib/haptics";

/**
 * 復習セッションの状態機械。UI から評価送信・アーカイブ・追加モード・
 * キーボード操作までの副作用をまとめて扱い、コンポーネントを表示に専念させる。
 * SM-2/FSRS 評価 mutation やスナップショット不変条件は既存のまま維持する。
 */
export function useReviewSession(deckId?: number) {
  const todaySession = useTodaySession(deckId);
  const { data, isError, refetch } = todaySession;
  const { data: allDecks } = useDeckList();
  const scopedDeck =
    deckId !== undefined ? allDecks?.find((d) => d.id === deckId) : undefined;
  // gcTime (10分) で残った前回セッションのキャッシュが一瞬表示されて別カードが
  // チラつく現象を抑止する。初回 fetch 完了までは読み込み中扱いにする。
  const isInitialLoading = !todaySession.isFetchedAfterMount && !isError;
  const answerMutation = useAnswerReview();
  const archiveMutation = useArchiveFromReview();

  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<ReviewRating, number>>(
    { again: 0, hard: 0, good: 0, easy: 0 }
  );
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
  const currentExtraCard = extraMode
    ? (current as ExtraCard | undefined)
    : undefined;
  const isDone =
    !isInitialLoading && cards.length > 0 && index >= cards.length && !extraMode;
  const isExtraDone =
    extraMode &&
    !isExtraInitialLoading &&
    extraCards.length > 0 &&
    extraIndex >= extraCards.length;

  const handleReveal = useCallback(() => setShowAnswer(true), []);

  // mutateAsync を ref に固定し、useCallback の依存変動を抑える
  const answerMutateRef = useRef(answerMutation.mutateAsync);
  answerMutateRef.current = answerMutation.mutateAsync;
  // 連打 / キーボード連打のガード (state 更新前の連続呼び出しを止める)
  const isSubmittingRef = useRef(false);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!current) return;
      if (isSubmittingRef.current || answerMutation.isPending) return;
      isSubmittingRef.current = true;
      // タブ放置 / 時計操作対策: response_time を 5 分でクランプ
      const elapsed = Math.min(
        Math.max(Date.now() - startedAt, 0),
        5 * 60 * 1000
      );
      try {
        await answerMutateRef.current({
          card_id: current.id,
          rating,
          response_time_ms: elapsed,
        });
        haptic("success");
        setCompleted((c) => c + 1);
        setRatingCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
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

  const handleArchive = useCallback(() => {
    if (!current) return;
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
  }, [current, extraMode, archiveMutation]);

  const startExtra = useCallback(() => {
    setExtraMode(true);
    setExtraIndex(0);
    setExtraCompleted(0);
    setShowAnswer(false);
  }, []);

  const retake = useCallback(() => {
    setIndex(0);
    setCompleted(0);
    setRatingCounts({ again: 0, hard: 0, good: 0, easy: 0 });
    setShowAnswer(false);
    refetch();
  }, [refetch]);

  // PC キーボードショートカット (Space/Enter=答え, 1-4=評価)
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

  return {
    // データ状態
    isInitialLoading,
    isError,
    refetch,
    isExtraInitialLoading,
    hasCards: data?.has_cards !== false,
    cardCount: cards.length,
    extraCardCount: extraCards.length,
    scopedDeck,
    // 出題状態
    current,
    currentExtraCard,
    showAnswer,
    extraMode,
    isDone,
    isExtraDone,
    activeCards,
    activeIndex,
    activeCompleted,
    completed,
    extraCompleted,
    ratingCounts,
    answerPending: answerMutation.isPending,
    archivePending: archiveMutation.isPending,
    // 操作
    handleReveal,
    handleRate,
    handleNextExtra,
    handleArchive,
    startExtra,
    retake,
  };
}
