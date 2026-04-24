import { z } from "zod";

export const updateUserSettingSchema = z.object({
  default_domain_template_id: z.number().int().nullable().optional(),
  default_ai_provider: z.enum(["openai", "anthropic", "google"]).optional(),
  default_ai_model: z.string().max(100).optional(),
  default_generation_count: z.number().int().min(1).max(10).optional(),
});

export type UpdateUserSettingInput = z.infer<typeof updateUserSettingSchema>;
