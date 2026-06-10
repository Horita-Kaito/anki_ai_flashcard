import { describe, expect, it } from "vitest";
import { hasCloze, maskCloze, revealCloze } from "../src/cloze.js";

describe("cloze", () => {
  const text =
    "データを分析可能な形に{{c1::加工・クレンジング}}する";

  it("質問表示では答えが伏字になり露出しない", () => {
    const masked = maskCloze(text);
    expect(masked).toBe("データを分析可能な形に【____】する");
    expect(masked).not.toContain("加工・クレンジング");
  });

  it("答え表示では答えが埋め戻される", () => {
    expect(revealCloze(text)).toBe(
      "データを分析可能な形に【加工・クレンジング】する"
    );
  });

  it("複数の cloze をすべて処理する", () => {
    expect(maskCloze("{{c1::A}}と{{c2::B}}")).toBe("【____】と【____】");
    expect(revealCloze("{{c1::A}}と{{c2::B}}")).toBe("【A】と【B】");
  });

  it("cloze を含まないテキストはそのまま", () => {
    expect(maskCloze("ただの質問")).toBe("ただの質問");
    expect(hasCloze("ただの質問")).toBe(false);
    expect(hasCloze(text)).toBe(true);
  });

  it("c10 など複数桁の番号にも対応する", () => {
    expect(maskCloze("{{c10::X}}")).toBe("【____】");
  });
});
