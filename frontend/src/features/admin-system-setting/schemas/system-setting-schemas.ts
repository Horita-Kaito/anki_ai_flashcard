import { z } from "zod";

export const systemSettingResponseSchema = z.object({
  monthly_token_limit: z.number().int().nullable(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type SystemSettingResponse = z.infer<typeof systemSettingResponseSchema>;

/**
 * API へ送る入力型: monthly_token_limit は整数 or null (= 無制限)。
 * バックエンドの UpdateSystemSettingRequest に対応する。
 */
export const updateSystemSettingApiSchema = z.object({
  monthly_token_limit: z
    .union([z.number().int().min(1000).max(1_000_000_000), z.null()])
    .nullable(),
});
export type UpdateSystemSettingApiInput = z.infer<
  typeof updateSystemSettingApiSchema
>;

/**
 * フォーム入力スキーマ: 値は string で扱い、submit 時に API 入力型へ変換する。
 *
 * `<input type="text" inputMode="numeric">` の挙動を直接 zod で表現するため
 * `monthly_token_limit` を string として受ける。空欄は「無制限 (= null)」、
 * 値ありなら整数 1000〜10億 の範囲を強制する。
 */
export const updateSystemSettingFormSchema = z.object({
  monthly_token_limit: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), {
      message: "整数で入力してください",
    })
    .refine(
      (v) => {
        if (v === "") return true;
        const n = Number(v);
        return Number.isFinite(n) && n >= 1000;
      },
      { message: "1000 以上を指定してください (無制限にするには空欄)" },
    )
    .refine(
      (v) => {
        if (v === "") return true;
        const n = Number(v);
        return Number.isFinite(n) && n <= 1_000_000_000;
      },
      { message: "値が大きすぎます (10 億以下)" },
    ),
});
export type UpdateSystemSettingFormInput = z.infer<
  typeof updateSystemSettingFormSchema
>;

/**
 * フォーム入力 (string) を API 入力 (number | null) に変換する。
 */
export function formInputToApiInput(
  form: UpdateSystemSettingFormInput,
): UpdateSystemSettingApiInput {
  const trimmed = form.monthly_token_limit.trim();
  return {
    monthly_token_limit: trimmed === "" ? null : Number(trimmed),
  };
}
