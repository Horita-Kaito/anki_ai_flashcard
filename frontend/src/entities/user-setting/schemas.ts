import { z } from "zod";

export const userSettingResponseSchema = z
  .object({
    default_domain_template_id: z.number().nullable(),
    default_ai_provider: z.enum(["openai", "anthropic", "google"]),
    default_ai_model: z.string(),
    default_generation_count: z.number(),
    desired_retention: z.number(),
  })
  .passthrough();

export type UserSettingResponse = z.infer<typeof userSettingResponseSchema>;
