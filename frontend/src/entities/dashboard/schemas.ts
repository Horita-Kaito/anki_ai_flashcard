import { z } from "zod";

const recentNoteSchema = z
  .object({
    id: z.number(),
    body: z.string(),
    created_at: z.string().nullable(),
  })
  .passthrough();

const recentCardSchema = z
  .object({
    id: z.number(),
    question: z.string(),
    created_at: z.string().nullable(),
  })
  .passthrough();

const aiUsageSchema = z
  .object({
    today_calls: z.number(),
    month_calls: z.number(),
    month_cost_usd: z.number(),
  })
  .passthrough();

const streakInfoSchema = z
  .object({
    current: z.number(),
    longest: z.number(),
    today_done: z.boolean(),
  })
  .passthrough();

export const dashboardSummaryResponseSchema = z
  .object({
    due_count_today: z.number(),
    new_cards_count: z.number(),
    total_cards: z.number(),
    recent_notes: z.array(recentNoteSchema),
    recent_cards: z.array(recentCardSchema),
    ai_usage: aiUsageSchema,
    streak: streakInfoSchema,
  })
  .passthrough();

export type DashboardSummaryResponse = z.infer<
  typeof dashboardSummaryResponseSchema
>;
