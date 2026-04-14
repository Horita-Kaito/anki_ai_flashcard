import { z } from "zod";

export const updateUserSettingSchema = z.object({
  default_domain_template_id: z.number().int().nullable().optional(),
  daily_new_limit: z.number().int().min(0).max(500).optional(),
  daily_review_limit: z.number().int().min(0).max(2000).optional(),
  default_ai_provider: z.enum(["openai", "anthropic", "google"]).optional(),
  default_ai_model: z.string().max(100).optional(),
  default_generation_count: z.number().int().min(1).max(10).optional(),
});

export type UpdateUserSettingInput = z.infer<typeof updateUserSettingSchema>;
