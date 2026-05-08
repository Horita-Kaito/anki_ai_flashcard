import { describe, it, expect } from "vitest";
import { createAdminUserSchema, toApiPayload } from "./admin-user-schemas";

describe("createAdminUserSchema", () => {
  it("正しい displayName + contactEmail で成功する", () => {
    const result = createAdminUserSchema.safeParse({
      displayName: "k-yamamoto",
      contactEmail: "k-yamamoto@wown.co.jp",
    });
    expect(result.success).toBe(true);
  });

  it("displayName が空だと失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      displayName: "",
      contactEmail: "k-yamamoto@wown.co.jp",
    });
    expect(result.success).toBe(false);
  });

  it("displayName が 256 文字以上で失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      displayName: "a".repeat(256),
      contactEmail: "k-yamamoto@wown.co.jp",
    });
    expect(result.success).toBe(false);
  });

  it("contactEmail が形式不正だと失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      displayName: "k-yamamoto",
      contactEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("contactEmail が空だと失敗する", () => {
    const result = createAdminUserSchema.safeParse({
      displayName: "k-yamamoto",
      contactEmail: "",
    });
    expect(result.success).toBe(false);
  });

  it("前後の空白は trim される", () => {
    const result = createAdminUserSchema.safeParse({
      displayName: "  k-yamamoto  ",
      contactEmail: "  k-yamamoto@wown.co.jp\n",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contactEmail).toBe("k-yamamoto@wown.co.jp");
      expect(result.data.displayName).toBe("k-yamamoto");
    }
  });

  it("contactEmail が 256 文字以上で失敗する", () => {
    const longLocal = "a".repeat(251);
    const result = createAdminUserSchema.safeParse({
      displayName: "k-yamamoto",
      contactEmail: `${longLocal}@b.jp`,
    });
    expect(result.success).toBe(false);
  });
});

describe("toApiPayload", () => {
  it("displayName/contactEmail を name/email にマップする", () => {
    expect(
      toApiPayload({
        displayName: "k-yamamoto",
        contactEmail: "k-yamamoto@wown.co.jp",
      })
    ).toEqual({
      name: "k-yamamoto",
      email: "k-yamamoto@wown.co.jp",
    });
  });
});
