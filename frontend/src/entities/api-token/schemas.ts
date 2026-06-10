import { z } from "zod";

export const apiTokenSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    abilities: z.array(z.string()),
    last_used_at: z.string().nullable(),
    created_at: z.string().nullable(),
  })
  .passthrough();

export const apiTokenListSchema = z.array(apiTokenSchema);

export type ApiTokenResponse = z.infer<typeof apiTokenSchema>;
