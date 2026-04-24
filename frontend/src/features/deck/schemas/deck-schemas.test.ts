import { describe, it, expect } from "vitest";
import { createDeckSchema } from "./deck-schemas";

describe("createDeckSchema", () => {
  it("必須項目のみで成功する", () => {
    const result = createDeckSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
  });

  it("name が空だと失敗する", () => {
    const result = createDeckSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("name が 256 文字以上で失敗する", () => {
    const result = createDeckSchema.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("description は省略可能", () => {
    const result = createDeckSchema.safeParse({ name: "Test", description: "" });
    expect(result.success).toBe(true);
  });

  it("parent_id に null を指定できる", () => {
    const result = createDeckSchema.safeParse({ name: "Test", parent_id: null });
    expect(result.success).toBe(true);
  });

  it("parent_id に数値を指定できる", () => {
    const result = createDeckSchema.safeParse({ name: "Test", parent_id: 10 });
    expect(result.success).toBe(true);
  });
});
