import { z } from "zod";

export const tagResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    created_at: z.string().nullable(),
  })
  .passthrough();

export type TagResponse = z.infer<typeof tagResponseSchema>;
