import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  answerReview,
  fetchReviewStats,
  fetchTodaySession,
} from "./endpoints";
import type { ReviewRating } from "@/entities/review/types";

export const reviewKeys = {
  today: (deckId?: number) => ["review", "today", deckId ?? null] as const,
  stats: ["review", "stats"] as const,
};

export function useTodaySession(deckId?: number) {
  return useQuery({
    queryKey: reviewKeys.today(deckId),
    queryFn: () => fetchTodaySession(deckId),
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
  });
}
