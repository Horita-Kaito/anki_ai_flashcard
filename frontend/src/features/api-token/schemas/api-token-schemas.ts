import { z } from "zod";

export const issueTokenSchema = z.object({
  device_name: z
    .string()
    .min(1, "トークン名を入力してください")
    .max(255, "トークン名は255文字以内で入力してください"),
  scope: z.enum(["full", "mcp"]),
});

export type IssueTokenInput = z.infer<typeof issueTokenSchema>;
