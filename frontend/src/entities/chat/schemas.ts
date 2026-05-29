import { z } from "zod";

export const chatMessageSchema = z.object({
  id: z.number(),
  chat_session_id: z.number(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const chatSessionSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  domain_template_id: z.number().nullable(),
  deck_id: z.number().nullable(),
  messages_count: z.number().nullable(),
  messages: z.array(chatMessageSchema).optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
