import { z } from "zod";
import { CARD_TYPES } from "@/entities/card/types";

const domainTemplateInstructionSchema = z
  .object({
    goal: z.string(),
    priorities: z.array(z.string()),
    avoid: z.array(z.string()).optional(),
    preferred_card_types: z.array(z.enum(CARD_TYPES)).optional(),
    answer_style: z.string().optional(),
    difficulty_policy: z.string().optional(),
    note_interpretation_policy: z.string().optional(),
  })
  .passthrough();

export const domainTemplateResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    instruction_json: domainTemplateInstructionSchema,
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type DomainTemplateResponse = z.infer<
  typeof domainTemplateResponseSchema
>;
