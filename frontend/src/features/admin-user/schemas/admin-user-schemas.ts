import { z } from "zod";

export const createAdminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "ユーザー名を入力してください")
    .max(255, "ユーザー名は 255 文字以内で入力してください"),
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください")
    .max(255, "メールアドレスは 255 文字以内で入力してください"),
});
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;

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
