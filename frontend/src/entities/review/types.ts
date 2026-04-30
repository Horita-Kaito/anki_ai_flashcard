import type { Card, Scheduler } from "@/entities/card/types";

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
  scheduler: Scheduler;
  updated_schedule: {
    state: string;
    repetitions: number;
    interval_days: number;
    /** SM-2 のみ。FSRS では null */
    ease_factor: number | null;
    /** FSRS のみ。SM-2 では null */
    stability: number | null;
    /** FSRS のみ。1.0〜10.0 */
    difficulty: number | null;
    due_at: string | null;
    lapse_count: number;
  };
}

export interface ExtraCard extends Card {
  days_until_due: number;
}

export interface ExtraSession {
  total: number;
  cards: ExtraCard[];
}

export interface DeckStats {
  deck_id: number;
  deck_name: string;
  review_count: number;
  again_count: number;
  again_rate: number;
}

export interface ReviewStats {
  today: {
    completed_count: number;
    again_count: number;
    hard_count: number;
    good_count: number;
    easy_count: number;
  };
  week: {
    completed_count: number;
    again_rate: number;
  };
  month: {
    completed_count: number;
  };
  overall: {
    total_reviews: number;
  };
  by_deck: DeckStats[];
}
