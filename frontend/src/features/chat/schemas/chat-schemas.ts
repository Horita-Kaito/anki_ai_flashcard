import { z } from "zod";

export const createChatSessionSchema = z.object({
  title: z.string().max(120).optional(),
  domain_template_id: z.number().int().positive().nullable().optional(),
  deck_id: z.number().int().positive().nullable().optional(),
});

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1, "質問を入力してください").max(4000),
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
