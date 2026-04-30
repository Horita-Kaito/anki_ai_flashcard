import { describe, it, expect } from "vitest";
import { stripMarkdown } from "./strip-markdown";

describe("stripMarkdown", () => {
  it("見出し記号を除去する", () => {
    expect(stripMarkdown("# テストメモ")).toBe("テストメモ");
    expect(stripMarkdown("### 小見出し")).toBe("小見出し");
  });

  it("リストマーカーを除去する", () => {
    expect(stripMarkdown("- 項目1\n- 項目2")).toBe("項目1 項目2");
    expect(stripMarkdown("1. 一つ目\n2. 二つ目")).toBe("一つ目 二つ目");
  });

  it("強調を中身だけ残す", () => {
    expect(stripMarkdown("これは **太字** と *斜体* と ~~取り消し~~"))
      .toBe("これは 太字 と 斜体 と 取り消し");
  });

  it("インラインコードと code block を中身だけ残す", () => {
    expect(stripMarkdown("`inline` と\n```js\nconst x = 1;\n```"))
      .toBe("inline と const x = 1;");
  });

  it("リンクは表示テキストだけ残す", () => {
    expect(stripMarkdown("[Anthropic](https://anthropic.com) のサイト"))
      .toBe("Anthropic のサイト");
  });

  it("画像は alt を残す", () => {
    expect(stripMarkdown("![ロゴ](logo.png) です")).toBe("ロゴ です");
  });

  it("引用と HR を除去する", () => {
    expect(stripMarkdown("> 引用文\n\n---\n\n本文")).toBe("引用文 本文");
  });

  it("HTML タグを除去する", () => {
    expect(stripMarkdown("<b>太字</b> と <em>斜体</em>"))
      .toBe("太字 と 斜体");
  });

  it("空文字に対しても安全", () => {
    expect(stripMarkdown("")).toBe("");
  });

  it("Markdown 記法を含まないプレーンテキストはそのまま (空白圧縮のみ)", () => {
    expect(stripMarkdown("普通の\n文章です")).toBe("普通の 文章です");
  });

  it("複合パターン (見出し + リスト + 強調)", () => {
    const input = "# Anki AI\n\n- **重要**: 学習メモ\n- `react-markdown` を使用";
    expect(stripMarkdown(input)).toBe(
      "Anki AI 重要: 学習メモ react-markdown を使用"
    );
  });
});
