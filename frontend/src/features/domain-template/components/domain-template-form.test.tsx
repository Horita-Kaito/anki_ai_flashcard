import { describe, it, expect } from "vitest";
import { buildPolicyPreview } from "./domain-template-form";

describe("buildPolicyPreview", () => {
  it("name と domain_hint があると分野ポリシーブロックを構築する", () => {
    const result = buildPolicyPreview({
      name: "プログラミング",
      description: "",
      domain_hint: "コードの設計意図を軸に簡潔に。",
    });
    expect(result).toBe(
      "【分野ポリシー: プログラミング】\nコードの設計意図を軸に簡潔に。"
    );
  });

  it("domain_hint が空文字なら省略メッセージを返す (AI にブロックが渡らないことを明示)", () => {
    const result = buildPolicyPreview({
      name: "テンプレ",
      description: "",
      domain_hint: "",
    });
    expect(result).toContain("分野ヒントが空のため");
    expect(result).toContain("AI には分野ポリシーブロックが渡されません");
  });

  it("domain_hint が空白だけでも省略メッセージを返す", () => {
    const result = buildPolicyPreview({
      name: "テンプレ",
      description: "",
      domain_hint: "   \n\t ",
    });
    expect(result).toContain("分野ヒントが空のため");
  });

  it("name が空のときは「(無名のテンプレート)」とプレースホルダで表示する", () => {
    const result = buildPolicyPreview({
      name: "",
      description: "",
      domain_hint: "テスト用ヒント",
    });
    expect(result).toBe("【分野ポリシー: (無名のテンプレート)】\nテスト用ヒント");
  });

  it("domain_hint の前後空白は trim される前提なので結果に余計な空白が混ざらない", () => {
    const result = buildPolicyPreview({
      name: "テンプレ",
      description: "",
      domain_hint: "  ヒント本文  ",
    });
    // 現状の挙動: trim 後の "ヒント本文" がそのまま使われる
    expect(result).toBe("【分野ポリシー: テンプレ】\nヒント本文");
  });
});
