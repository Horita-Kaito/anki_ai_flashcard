import { describe, it, expect } from "vitest";
import { issueTokenSchema } from "./api-token-schemas";

describe("issueTokenSchema", () => {
  it("有効な入力を受け付ける", () => {
    const result = issueTokenSchema.safeParse({
      device_name: "claude-mcp",
      scope: "mcp",
    });
    expect(result.success).toBe(true);
  });

  it("空のトークン名を拒否する", () => {
    const result = issueTokenSchema.safeParse({ device_name: "", scope: "mcp" });
    expect(result.success).toBe(false);
  });

  it("255文字のトークン名は受け付ける(境界値)", () => {
    const result = issueTokenSchema.safeParse({
      device_name: "a".repeat(255),
      scope: "full",
    });
    expect(result.success).toBe(true);
  });

  it("256文字のトークン名を拒否する(境界値)", () => {
    const result = issueTokenSchema.safeParse({
      device_name: "a".repeat(256),
      scope: "full",
    });
    expect(result.success).toBe(false);
  });

  it("不正な scope を拒否する", () => {
    const result = issueTokenSchema.safeParse({
      device_name: "x",
      scope: "admin",
    });
    expect(result.success).toBe(false);
  });
});
