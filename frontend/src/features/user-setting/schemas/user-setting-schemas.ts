import { z } from "zod";

export const updateUserSettingSchema = z.object({
  default_domain_template_id: z.number().int().nullable().optional(),
  default_ai_provider: z.enum(["openai", "anthropic", "google"]).optional(),
  default_ai_model: z.string().max(100).optional(),
  default_generation_count: z.number().int().min(1).max(10).optional(),
  /**
   * FSRS 用の目標想起率。0.7〜0.97 (典型 0.9 = 復習時に 90% で想起できる間隔を狙う)。
   * 高いほど復習頻度が増えて記憶定着は確実だが学習量が減る。
   */
  desired_retention: z.number().min(0.7).max(0.97).optional(),
});

export type UpdateUserSettingInput = z.infer<typeof updateUserSettingSchema>;
