import { z } from "zod";

export const createDomainTemplateSchema = z.object({
  name: z.string().min(1, "テンプレート名を入力してください").max(255),
  // 空文字 / 未設定 / null を全て許容: API 送信時に null へ正規化される
  description: z.string().max(1000).optional().nullable().or(z.literal("")),
  domain_hint: z
    .string()
    .max(500, "分野ヒントは500文字以内で入力してください")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export type CreateDomainTemplateInput = z.infer<
  typeof createDomainTemplateSchema
>;

export const updateDomainTemplateSchema = createDomainTemplateSchema.partial();
export type UpdateDomainTemplateInput = z.infer<
  typeof updateDomainTemplateSchema
>;
