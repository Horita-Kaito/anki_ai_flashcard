import { describe, it, expect } from "vitest";
import { createAdminUserSchema } from "./admin-user-schemas";

describe("createAdminUserSchema", () => {
  it("正しい name + email で成功する", () => {
    const result = createAdminUserSchema.safeParse({
      name: "k-yamamoto",
      email: "k-yamamoto@wown.co.jp",
    });
    expect(result.success).toBe(true);
  });

  it("name が空だと失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      name: "",
      email: "k-yamamoto@wown.co.jp",
    });
    expect(result.success).toBe(false);
  });

  it("name が 256 文字以上で失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      name: "a".repeat(256),
      email: "k-yamamoto@wown.co.jp",
    });
    expect(result.success).toBe(false);
  });

  it("email が形式不正だと失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      name: "k-yamamoto",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("email が空だと失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      name: "k-yamamoto",
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("email が 256 文字以上で失敗する", () => {
    const longLocal = "a".repeat(251);
    const result = createAdminUserSchema.safeParse({
      name: "k-yamamoto",
      email: `${longLocal}@b.jp`,
    });
    expect(result.success).toBe(false);
  });
});
