import { describe, it, expect } from "vitest";
import { createDomainTemplateSchema } from "./domain-template-schemas";

describe("createDomainTemplateSchema", () => {
  it("name と domain_hint を持つ最小構成で成功する", () => {
    const result = createDomainTemplateSchema.safeParse({
      name: "Web開発",
      domain_hint: "Web開発の基礎を学ぶ",
    });
    expect(result.success).toBe(true);
  });

  it("name だけでも成功する (domain_hint は optional)", () => {
    const result = createDomainTemplateSchema.safeParse({ name: "Web開発" });
    expect(result.success).toBe(true);
  });

  it("name が空で失敗する", () => {
    const result = createDomainTemplateSchema.safeParse({
      name: "",
      domain_hint: "本文",
    });
    expect(result.success).toBe(false);
  });

  it("domain_hint が 500 字超で失敗する", () => {
    const result = createDomainTemplateSchema.safeParse({
      name: "Web開発",
      domain_hint: "あ".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("domain_hint が空文字でも成功する (null として扱う)", () => {
    const result = createDomainTemplateSchema.safeParse({
      name: "Web開発",
      domain_hint: "",
    });
    expect(result.success).toBe(true);
  });
});
