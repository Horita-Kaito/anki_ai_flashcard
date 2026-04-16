import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import type {
  AnswerResult,
  ReviewRating,
  ReviewStats,
  TodaySession,
} from "@/entities/review/types";
import {
  todaySessionResponseSchema,
  reviewStatsResponseSchema,
} from "@/entities/review/schemas";
import { parseApiDataResponse } from "@/shared/api/parse-response";

export async function fetchTodaySession(
  deckId?: number
): Promise<TodaySession> {
  const res = await apiClient.get(
    "/review-sessions/today",
    { params: deckId ? { deck_id: deckId } : {} }
  );
  return parseApiDataResponse(todaySessionResponseSchema, res);
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
  const res = await apiClient.get("/review-stats");
  return parseApiDataResponse(reviewStatsResponseSchema, res);
}

export async function archiveCardFromReview(cardId: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.post(`/cards/${cardId}/archive`);
}
