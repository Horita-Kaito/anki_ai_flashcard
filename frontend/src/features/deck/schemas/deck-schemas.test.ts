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

  it("new_cards_limit が範囲外で失敗する", () => {
    const over = createDeckSchema.safeParse({ name: "ok", new_cards_limit: 101 });
    const under = createDeckSchema.safeParse({ name: "ok", new_cards_limit: 0 });
    expect(over.success).toBe(false);
    expect(under.success).toBe(false);
  });

  it("description は省略可能", () => {
    const result = createDeckSchema.safeParse({ name: "Test", description: "" });
    expect(result.success).toBe(true);
  });
});
