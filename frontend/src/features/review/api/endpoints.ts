import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type {
  AnswerResult,
  ReviewRating,
  ReviewStats,
  TodaySession,
} from "@/entities/review/types";

export async function fetchTodaySession(
  deckId?: number
): Promise<TodaySession> {
  const res = await apiClient.get<{ data: TodaySession }>(
    "/review-sessions/today",
    { params: deckId ? { deck_id: deckId } : {} }
  );
  return res.data.data;
}

export async function answerReview(input: {
  card_id: number;
  rating: ReviewRating;
  response_time_ms?: number;
}): Promise<AnswerResult> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: AnswerResult }>(
    "/review-sessions/answer",
    input
  );
  return res.data.data;
}

export async function fetchReviewStats(): Promise<ReviewStats> {
  const res = await apiClient.get<{ data: ReviewStats }>("/review-stats");
  return res.data.data;
}
