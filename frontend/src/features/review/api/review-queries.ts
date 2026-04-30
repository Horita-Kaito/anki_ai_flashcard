import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  answerReview,
  archiveCardFromReview,
  fetchExtraSession,
  fetchReviewStats,
  fetchTodaySession,
} from "./endpoints";
import type { ReviewRating } from "@/entities/review/types";

export const reviewKeys = {
  today: (deckId?: number) => ["review", "today", deckId ?? null] as const,
  extra: ["review", "extra"] as const,
  stats: ["review", "stats"] as const,
};

export function useTodaySession(deckId?: number) {
  return useQuery({
    queryKey: reviewKeys.today(deckId),
    queryFn: () => fetchTodaySession(deckId),
    staleTime: 0,
    // 復習画面は「今この瞬間」の due カードを必ず使いたい。
    // gcTime のキャッシュ (前回訪問時のスナップショット) が一瞬出て
    // 別カードがチラつく現象を防ぐため、マウント時は必ず refetch する。
    refetchOnMount: "always",
  });
}

export function useExtraSession(enabled: boolean) {
  return useQuery({
    queryKey: reviewKeys.extra,
    queryFn: fetchExtraSession,
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useAnswerReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      card_id: number;
      rating: ReviewRating;
      response_time_ms?: number;
    }) => answerReview(input),
    onSuccess: () => {
      // ["review", "today"] は 1 セッション開始時のスナップショットを最後まで使う。
      // ここで invalidate すると refetch で配列が縮み、index と添字がズレてカードを飛ばす。
      qc.invalidateQueries({ queryKey: reviewKeys.stats });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: reviewKeys.stats,
    queryFn: fetchReviewStats,
    staleTime: 60 * 1000,
  });
}

export function useArchiveFromReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: number) => archiveCardFromReview(cardId),
    onSuccess: () => {
      // 同上、today は invalidate しない (セッション中スナップショット維持)
      qc.invalidateQueries({ queryKey: reviewKeys.stats });
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
