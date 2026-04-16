import { z } from "zod";
import { CARD_TYPES } from "@/entities/card/types";
import { CANDIDATE_STATUSES } from "./types";

export const aiCardCandidateResponseSchema = z
  .object({
    id: z.number(),
    note_seed_id: z.number(),
    ai_generation_log_id: z.number().nullable(),
    provider: z.string(),
    model_name: z.string(),
    question: z.string(),
    answer: z.string(),
    card_type: z.enum(CARD_TYPES),
    focus_type: z.string().nullable(),
    rationale: z.string().nullable(),
    confidence: z.number().nullable(),
    suggested_deck_id: z.number().nullable(),
    status: z.enum(CANDIDATE_STATUSES),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type AiCardCandidateResponse = z.infer<
  typeof aiCardCandidateResponseSchema
>;
