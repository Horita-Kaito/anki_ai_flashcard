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
  new_cards_limit: z
    .number()
    .int()
    .min(1, "1以上で指定してください")
    .max(100, "100以下で指定してください")
    .optional(),
  review_limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .nullable()
    .optional(),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

export const updateDeckSchema = createDeckSchema.partial();
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
