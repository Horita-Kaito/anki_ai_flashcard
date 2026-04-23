import { describe, it, expect } from "vitest";
import { loginSchema } from "./auth-schemas";

describe("loginSchema", () => {
  it("正しい入力を受け入れる", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("メールアドレス形式が不正なら失敗する", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("パスワードが空なら失敗する", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
