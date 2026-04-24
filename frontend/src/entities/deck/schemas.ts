import { z } from "zod";

export const deckResponseSchema = z
  .object({
    id: z.number(),
    parent_id: z.number().nullable(),
    name: z.string(),
    description: z.string().nullable(),
    default_domain_template_id: z.number().nullable(),
    display_order: z.number(),
    path: z.array(z.string()).optional(),
    has_children: z.boolean().optional(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type DeckResponse = z.infer<typeof deckResponseSchema>;
