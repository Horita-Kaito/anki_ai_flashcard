import { describe, it, expect } from "vitest";
import { toAiErrorMessage } from "./ai-error-message";

function makeAxiosErr(status: number, data?: { code?: string; message?: string }) {
  return { response: { status, data } };
}

describe("toAiErrorMessage", () => {
  it("JSON_TRUNCATED コードで切り詰めメッセージを返す", () => {
    const msg = toAiErrorMessage(
      makeAxiosErr(502, { code: "JSON_TRUNCATED" }),
      "fallback",
    );
    expect(msg).toContain("途中で打ち切られ");
  });

  it("SAFETY_BLOCKED で安全フィルタ案内を返す", () => {
    const msg = toAiErrorMessage(
      makeAxiosErr(502, { code: "SAFETY_BLOCKED" }),
      "fallback",
    );
    expect(msg).toContain("安全フィルタ");
  });

  it("MAX_TOKENS で出力長文の案内を返す", () => {
    const msg = toAiErrorMessage(
      makeAxiosErr(502, { code: "MAX_TOKENS" }),
      "fallback",
    );
    expect(msg).toContain("長すぎ");
  });

  it("429 はレート制限メッセージ", () => {
    const msg = toAiErrorMessage(makeAxiosErr(429), "fallback");
    expect(msg).toContain("一時的に制限");
  });

  it("未知のコードでサーバー message があればそれを使う", () => {
    const msg = toAiErrorMessage(
      makeAxiosErr(502, { code: "UNKNOWN_CODE", message: "server says hi" }),
      "fallback",
    );
    expect(msg).toBe("server says hi");
  });

  it("コードもメッセージも無い 502 は従来文言", () => {
    const msg = toAiErrorMessage(makeAxiosErr(502), "fallback");
    expect(msg).toContain("AI の応答解析に失敗");
  });

  it("それ以外は fallback", () => {
    expect(toAiErrorMessage({}, "default text")).toBe("default text");
  });
});
