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
  });
}

export function useExtraSession(enabled: boolean) {
  return useQuery({
    queryKey: reviewKeys.extra,
    queryFn: fetchExtraSession,
    enabled,
    staleTime: 0,
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
      qc.invalidateQueries({ queryKey: ["review"] });
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
      qc.invalidateQueries({ queryKey: ["review"] });
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
