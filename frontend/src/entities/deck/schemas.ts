import { z } from "zod";

export const deckResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    default_domain_template_id: z.number().nullable(),
    new_cards_limit: z.number(),
    review_limit: z.number().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type DeckResponse = z.infer<typeof deckResponseSchema>;
