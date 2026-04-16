import { z } from "zod";
import { CARD_TYPES, SCHEDULE_STATES } from "./types";

const cardTagSummarySchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .passthrough();

const cardScheduleSchema = z
  .object({
    state: z.enum(SCHEDULE_STATES),
    repetitions: z.number(),
    interval_days: z.number(),
    ease_factor: z.number(),
    due_at: z.string().nullable(),
    lapse_count: z.number(),
    archived_at: z.string().nullable().default(null),
  })
  .passthrough();

export const cardResponseSchema = z
  .object({
    id: z.number(),
    deck_id: z.number(),
    domain_template_id: z.number().nullable(),
    source_note_seed_id: z.number().nullable(),
    source_ai_candidate_id: z.number().nullable(),
    question: z.string(),
    answer: z.string(),
    explanation: z.string().nullable(),
    card_type: z.enum(CARD_TYPES),
    is_suspended: z.boolean(),
    is_archived: z.boolean().optional(),
    tags: z.array(cardTagSummarySchema).optional(),
    schedule: cardScheduleSchema.nullable().optional(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type CardResponse = z.infer<typeof cardResponseSchema>;
