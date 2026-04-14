import { z } from "zod";

export const createNoteSeedSchema = z.object({
  body: z
    .string()
    .min(1, "メモ本文を入力してください")
    .max(5000, "メモは5000文字以内で入力してください")
    .refine((v) => v.trim().length > 0, {
      message: "メモ本文を入力してください",
    }),
  domain_template_id: z.number().int().nullable().optional(),
  subdomain: z.string().max(255).optional().or(z.literal("")),
  learning_goal: z.string().max(1000).optional().or(z.literal("")),
  note_context: z.string().max(2000).optional().or(z.literal("")),
});

export type CreateNoteSeedInput = z.infer<typeof createNoteSeedSchema>;

export const updateNoteSeedSchema = createNoteSeedSchema.partial();
export type UpdateNoteSeedInput = z.infer<typeof updateNoteSeedSchema>;
