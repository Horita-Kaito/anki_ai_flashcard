import { z } from "zod";
import { CARD_TYPES, SCHEDULERS } from "@/entities/card/types";

export const createCardSchema = z.object({
  deck_id: z.number().int().min(1, "デッキを選択してください"),
  question: z
    .string()
    .min(1, "問題文を入力してください")
    .max(2000, "問題文は2000文字以内"),
  answer: z
    .string()
    .min(1, "回答を入力してください")
    .max(2000, "回答は2000文字以内"),
  explanation: z.string().max(5000).optional().or(z.literal("")),
  card_type: z.enum(CARD_TYPES),
  is_suspended: z.boolean().optional(),
  scheduler: z.enum(SCHEDULERS).optional(),
  tag_ids: z.array(z.number().int()).optional(),
});
export type CreateCardInput = z.infer<typeof createCardSchema>;

export const updateCardSchema = createCardSchema.partial();
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
