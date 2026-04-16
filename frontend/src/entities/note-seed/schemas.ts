import { z } from "zod";

export const noteSeedResponseSchema = z
  .object({
    id: z.number(),
    body: z.string(),
    domain_template_id: z.number().nullable(),
    subdomain: z.string().nullable(),
    learning_goal: z.string().nullable(),
    note_context: z.string().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough();

export type NoteSeedResponse = z.infer<typeof noteSeedResponseSchema>;
