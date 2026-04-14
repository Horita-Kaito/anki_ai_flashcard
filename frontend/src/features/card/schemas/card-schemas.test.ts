import { describe, it, expect } from "vitest";
import { createCardSchema } from "./card-schemas";

describe("createCardSchema", () => {
  const valid = {
    deck_id: 1,
    question: "Q",
    answer: "A",
    card_type: "basic_qa" as const,
  };

  it("最小構成で成功", () => {
    expect(createCardSchema.safeParse(valid).success).toBe(true);
  });

  it("deck_id=0 で失敗", () => {
    expect(
      createCardSchema.safeParse({ ...valid, deck_id: 0 }).success
    ).toBe(false);
  });

  it("question 空で失敗", () => {
    expect(
      createCardSchema.safeParse({ ...valid, question: "" }).success
    ).toBe(false);
  });

  it("answer 空で失敗", () => {
    expect(
      createCardSchema.safeParse({ ...valid, answer: "" }).success
    ).toBe(false);
  });

  it("不正な card_type で失敗", () => {
    expect(
      createCardSchema.safeParse({ ...valid, card_type: "invalid" as unknown as "basic_qa" }).success
    ).toBe(false);
  });
});
