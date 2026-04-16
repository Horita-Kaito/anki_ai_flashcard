import { z } from "zod";
import { REVIEW_RATINGS } from "./types";
import { cardResponseSchema } from "@/entities/card/schemas";

export const todaySessionResponseSchema = z
  .object({
    total_due: z.number(),
    new_count: z.number(),
    review_count: z.number(),
    cards: z.array(cardResponseSchema),
  })
  .passthrough();

export type TodaySessionResponse = z.infer<typeof todaySessionResponseSchema>;

export const extraCardSchema = cardResponseSchema.extend({
  days_until_due: z.number(),
});

export const extraSessionResponseSchema = z
  .object({
    total: z.number(),
    cards: z.array(extraCardSchema),
  })
  .passthrough();

export type ExtraSessionResponse = z.infer<typeof extraSessionResponseSchema>;

const updatedScheduleSchema = z
  .object({
    state: z.string(),
    repetitions: z.number(),
    interval_days: z.number(),
    ease_factor: z.number(),
    due_at: z.string().nullable(),
    lapse_count: z.number(),
  })
  .passthrough();

export const answerResultResponseSchema = z
  .object({
    card_id: z.number(),
    rating: z.enum(REVIEW_RATINGS),
    updated_schedule: updatedScheduleSchema,
  })
  .passthrough();

export type AnswerResultResponse = z.infer<typeof answerResultResponseSchema>;

const deckStatsSchema = z
  .object({
    deck_id: z.number(),
    deck_name: z.string(),
    review_count: z.number(),
    again_count: z.number(),
    again_rate: z.number(),
  })
  .passthrough();

export const reviewStatsResponseSchema = z
  .object({
    today: z
      .object({
        completed_count: z.number(),
        again_count: z.number(),
        hard_count: z.number(),
        good_count: z.number(),
        easy_count: z.number(),
      })
      .passthrough(),
    week: z
      .object({
        completed_count: z.number(),
        again_rate: z.number(),
      })
      .passthrough(),
    month: z
      .object({
        completed_count: z.number(),
      })
      .passthrough(),
    overall: z
      .object({
        total_reviews: z.number(),
      })
      .passthrough(),
    by_deck: z.array(deckStatsSchema),
  })
  .passthrough();

export type ReviewStatsResponse = z.infer<typeof reviewStatsResponseSchema>;
