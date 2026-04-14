import { describe, it, expect } from "vitest";
import { createNoteSeedSchema } from "./note-seed-schemas";

describe("createNoteSeedSchema", () => {
  it("本文があれば成功", () => {
    expect(createNoteSeedSchema.safeParse({ body: "Hello" }).success).toBe(true);
  });

  it("空文字は失敗", () => {
    expect(createNoteSeedSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("空白のみは失敗", () => {
    expect(createNoteSeedSchema.safeParse({ body: "   \n\t" }).success).toBe(false);
  });

  it("5001文字で失敗", () => {
    expect(
      createNoteSeedSchema.safeParse({ body: "a".repeat(5001) }).success
    ).toBe(false);
  });
});
