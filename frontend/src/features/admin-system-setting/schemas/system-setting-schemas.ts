import { z } from "zod";

export const systemSettingResponseSchema = z.object({
  monthly_token_limit: z.number().int().nullable(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type SystemSettingResponse = z.infer<typeof systemSettingResponseSchema>;

/**
 * フォーム入力。空文字 / 未入力は「無制限 (= null)」として送る。
 * 値ありの場合は min=1000 を強制 (API のバリデーションと一致)。
 */
export const updateSystemSettingSchema = z.object({
  monthly_token_limit: z
    .union([z.number().int().min(1000).max(1000000000), z.null()])
    .nullable(),
});
export type UpdateSystemSettingInput = z.infer<
  typeof updateSystemSettingSchema
>;
