import type { Card } from "@/entities/card/types";

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export const REVIEW_RATING_LABELS: Record<ReviewRating, string> = {
  again: "もう一度",
  hard: "難しい",
  good: "普通",
  easy: "簡単",
};

export const REVIEW_RATING_SHORTCUTS: Record<ReviewRating, string> = {
  again: "1",
  hard: "2",
  good: "3",
  easy: "4",
};

export interface TodaySession {
  total_due: number;
  new_count: number;
  review_count: number;
  cards: Card[];
}

export interface AnswerResult {
  card_id: number;
  rating: ReviewRating;
  updated_schedule: {
    state: string;
    repetitions: number;
    interval_days: number;
    ease_factor: number;
    due_at: string | null;
    lapse_count: number;
  };
}

export interface ReviewStats {
  today: {
    completed_count: number;
    again_count: number;
    hard_count: number;
    good_count: number;
    easy_count: number;
  };
  overall: {
    total_reviews: number;
  };
}
