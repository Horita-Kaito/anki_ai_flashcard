import { describe, it, expect } from "vitest";
import { createDomainTemplateSchema } from "./domain-template-schemas";

describe("createDomainTemplateSchema", () => {
  const valid = {
    name: "Web開発",
    instruction_json: {
      goal: "基礎を学ぶ",
      priorities: ["定義を問う"],
    },
  };

  it("最小構成で成功する", () => {
    expect(createDomainTemplateSchema.safeParse(valid).success).toBe(true);
  });

  it("name が空で失敗する", () => {
    expect(
      createDomainTemplateSchema.safeParse({ ...valid, name: "" }).success
    ).toBe(false);
  });

  it("goal が空で失敗する", () => {
    const input = {
      ...valid,
      instruction_json: { ...valid.instruction_json, goal: "" },
    };
    expect(createDomainTemplateSchema.safeParse(input).success).toBe(false);
  });

  it("priorities が空配列で失敗する", () => {
    const input = {
      ...valid,
      instruction_json: { ...valid.instruction_json, priorities: [] },
    };
    expect(createDomainTemplateSchema.safeParse(input).success).toBe(false);
  });

  it("無効な card_type で失敗する", () => {
    const input = {
      ...valid,
      instruction_json: {
        ...valid.instruction_json,
        preferred_card_types: ["invalid"],
      },
    };
    expect(createDomainTemplateSchema.safeParse(input).success).toBe(false);
  });
});
