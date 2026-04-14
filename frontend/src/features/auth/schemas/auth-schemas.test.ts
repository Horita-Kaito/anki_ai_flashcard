import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "./auth-schemas";

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

describe("registerSchema", () => {
  it("password_confirmation が一致すれば成功", () => {
    const result = registerSchema.safeParse({
      name: "太郎",
      email: "test@example.com",
      password: "password123",
      password_confirmation: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("password_confirmation が一致しないと失敗する", () => {
    const result = registerSchema.safeParse({
      name: "太郎",
      email: "test@example.com",
      password: "password123",
      password_confirmation: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("password_confirmation"))).toBe(true);
    }
  });

  it("パスワードが 8 文字未満なら失敗する", () => {
    const result = registerSchema.safeParse({
      name: "太郎",
      email: "test@example.com",
      password: "short",
      password_confirmation: "short",
    });
    expect(result.success).toBe(false);
  });
});
