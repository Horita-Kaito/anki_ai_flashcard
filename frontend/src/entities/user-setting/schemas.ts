import { z } from "zod";

export const userSettingResponseSchema = z
  .object({
    default_domain_template_id: z.number().nullable(),
    default_ai_provider: z.enum(["openai", "google"]),
    default_ai_model: z.string(),
    desired_retention: z.number(),
  })
  .passthrough();

export type UserSettingResponse = z.infer<typeof userSettingResponseSchema>;
