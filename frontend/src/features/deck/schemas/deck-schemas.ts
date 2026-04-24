import { z } from "zod";

export const createDeckSchema = z.object({
  name: z
    .string()
    .min(1, "デッキ名を入力してください")
    .max(255, "デッキ名は255文字以内で入力してください"),
  description: z
    .string()
    .max(1000, "説明は1000文字以内で入力してください")
    .optional()
    .or(z.literal("")),
  parent_id: z.number().int().nullable().optional(),
  default_domain_template_id: z.number().int().nullable().optional(),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

export const updateDeckSchema = createDeckSchema.partial();
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
