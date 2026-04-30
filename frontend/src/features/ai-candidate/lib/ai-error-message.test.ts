import { describe, it, expect } from "vitest";
import { toAiErrorMessage, toAsyncFailureMessage } from "./ai-error-message";

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

  it("EMPTY_CANDIDATES で具体化を促すメッセージを返す", () => {
    const msg = toAiErrorMessage(
      makeAxiosErr(502, { code: "EMPTY_CANDIDATES" }),
      "fallback",
    );
    expect(msg).toContain("候補を生成できませんでした");
  });
});

describe("toAsyncFailureMessage", () => {
  it("[EMPTY_CANDIDATES] のログから具体化を促すメッセージ", () => {
    expect(
      toAsyncFailureMessage("[EMPTY_CANDIDATES] AI returned empty candidates array"),
    ).toContain("候補を生成できませんでした");
  });

  it("[INVALID_RESPONSE] でパースエラー文言", () => {
    expect(
      toAsyncFailureMessage("[INVALID_RESPONSE] json_error=No error, tail=..."),
    ).toContain("解析できません");
  });

  it("不明な code は汎用の失敗メッセージ", () => {
    expect(toAsyncFailureMessage("[UNKNOWN_THING] anything")).toContain(
      "失敗しました",
    );
  });

  it("null / 空 でも汎用の失敗メッセージ", () => {
    expect(toAsyncFailureMessage(null)).toContain("失敗しました");
    expect(toAsyncFailureMessage("")).toContain("失敗しました");
  });
});
