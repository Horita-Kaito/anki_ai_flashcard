import { describe, it, expect } from "vitest";
import {
  formInputToApiInput,
  systemSettingResponseSchema,
  updateSystemSettingApiSchema,
  updateSystemSettingFormSchema,
} from "./system-setting-schemas";

describe("systemSettingResponseSchema", () => {
  it("monthly_token_limit が数値で成功する", () => {
    const result = systemSettingResponseSchema.safeParse({
      monthly_token_limit: 500000,
    });
    expect(result.success).toBe(true);
  });

  it("monthly_token_limit が null で成功する", () => {
    const result = systemSettingResponseSchema.safeParse({
      monthly_token_limit: null,
    });
    expect(result.success).toBe(true);
  });

  it("monthly_token_limit が文字列だと失敗する", () => {
    const result = systemSettingResponseSchema.safeParse({
      monthly_token_limit: "500000",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSystemSettingApiSchema", () => {
  it("1000 ちょうどは成功する (境界値)", () => {
    expect(
      updateSystemSettingApiSchema.safeParse({ monthly_token_limit: 1000 })
        .success,
    ).toBe(true);
  });

  it("999 は失敗する (境界値)", () => {
    expect(
      updateSystemSettingApiSchema.safeParse({ monthly_token_limit: 999 })
        .success,
    ).toBe(false);
  });

  it("10 億ちょうどは成功する (境界値)", () => {
    expect(
      updateSystemSettingApiSchema.safeParse({
        monthly_token_limit: 1_000_000_000,
      }).success,
    ).toBe(true);
  });

  it("10 億超は失敗する", () => {
    expect(
      updateSystemSettingApiSchema.safeParse({
        monthly_token_limit: 1_000_000_001,
      }).success,
    ).toBe(false);
  });

  it("null は成功する (無制限)", () => {
    expect(
      updateSystemSettingApiSchema.safeParse({ monthly_token_limit: null })
        .success,
    ).toBe(true);
  });

  it("小数は失敗する (整数のみ)", () => {
    expect(
      updateSystemSettingApiSchema.safeParse({ monthly_token_limit: 1500.5 })
        .success,
    ).toBe(false);
  });
});

describe("updateSystemSettingFormSchema", () => {
  it("空欄は成功する (無制限扱い)", () => {
    expect(
      updateSystemSettingFormSchema.safeParse({ monthly_token_limit: "" })
        .success,
    ).toBe(true);
  });

  it("前後の空白は trim される", () => {
    const result = updateSystemSettingFormSchema.safeParse({
      monthly_token_limit: "  500000  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.monthly_token_limit).toBe("500000");
    }
  });

  it("整数以外の文字を含むと失敗する", () => {
    const result = updateSystemSettingFormSchema.safeParse({
      monthly_token_limit: "500abc",
    });
    expect(result.success).toBe(false);
  });

  it("小数点を含むと失敗する", () => {
    const result = updateSystemSettingFormSchema.safeParse({
      monthly_token_limit: "1500.5",
    });
    expect(result.success).toBe(false);
  });

  it("マイナス記号を含むと失敗する", () => {
    const result = updateSystemSettingFormSchema.safeParse({
      monthly_token_limit: "-1000",
    });
    expect(result.success).toBe(false);
  });

  it("1000 未満は失敗する (境界値)", () => {
    expect(
      updateSystemSettingFormSchema.safeParse({
        monthly_token_limit: "999",
      }).success,
    ).toBe(false);
  });

  it("1000 ちょうどは成功する (境界値)", () => {
    expect(
      updateSystemSettingFormSchema.safeParse({
        monthly_token_limit: "1000",
      }).success,
    ).toBe(true);
  });

  it("10 億超は失敗する", () => {
    expect(
      updateSystemSettingFormSchema.safeParse({
        monthly_token_limit: "1000000001",
      }).success,
    ).toBe(false);
  });
});

describe("formInputToApiInput", () => {
  it("空欄を null に変換する", () => {
    expect(formInputToApiInput({ monthly_token_limit: "" })).toEqual({
      monthly_token_limit: null,
    });
  });

  it("空白だけの入力も null に変換する", () => {
    expect(formInputToApiInput({ monthly_token_limit: "   " })).toEqual({
      monthly_token_limit: null,
    });
  });

  it("数値文字列を整数に変換する", () => {
    expect(formInputToApiInput({ monthly_token_limit: "500000" })).toEqual({
      monthly_token_limit: 500000,
    });
  });
});
