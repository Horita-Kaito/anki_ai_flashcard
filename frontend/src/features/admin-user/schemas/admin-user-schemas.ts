import { z } from "zod";

// 軽量な email 正規表現。サーバー側 (Laravel email rule) で最終チェックする前提で
// フロントは「@ と . が含まれて空白がない」程度に留める。zod の .email() は
// バージョン間で挙動差があるため、refine で固定する。
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// フォーム内部のフィールド名はパスワードマネージャに認識させないため
// 標準的な name/email を避け、displayName/contactEmail を採用する。
// API 送信時には backend が期待する name/email にマップする (toApiPayload)。
export const createAdminUserSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "ユーザー名を入力してください")
    .max(255, "ユーザー名は 255 文字以内で入力してください"),
  contactEmail: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .max(255, "メールアドレスは 255 文字以内で入力してください")
    .refine(
      (v) => EMAIL_PATTERN.test(v),
      "正しいメールアドレスを入力してください"
    ),
});
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

export interface CreateAdminUserPayload {
  name: string;
  email: string;
}

export function toApiPayload(input: CreateAdminUserInput): CreateAdminUserPayload {
  return { name: input.displayName, email: input.contactEmail };
}

export const adminCreatedUserResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  }),
  generated_password: z.string(),
});
export type AdminCreatedUserResponse = z.infer<
  typeof adminCreatedUserResponseSchema
>;
