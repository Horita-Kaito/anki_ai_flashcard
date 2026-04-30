/**
 * Markdown 記法を取り除いた素のテキストを返す。
 * 一覧プレビューや og:description など、Markdown レンダリングを使えない箇所で利用する。
 *
 * 完全な変換ではなく、記号ノイズを落として読みやすくすることが目的。
 * - 見出し / 箇条書き / 引用 / 水平線 マーカーを除去
 * - 強調 (**bold**, *italic*, ~~strike~~) を中身だけ残す
 * - インラインコード `code` / コードブロック ``` を中身だけ残す
 * - リンク [text](url) は text だけ残す、画像 ![alt](url) は alt を残す
 * - HTML タグを除去
 * - 連続改行を空白に圧縮 (line-clamp 用途を想定)
 */
export function stripMarkdown(input: string): string {
  if (!input) return "";

  let text = input;

  // コードブロック ```...``` → 中身
  text = text.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, "$1");
  // インラインコード `code` → code
  text = text.replace(/`([^`]+)`/g, "$1");
  // 画像 ![alt](url) → alt
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  // リンク [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // HTML タグ
  text = text.replace(/<[^>]+>/g, "");
  // 行頭の見出し記号 # ~ ######
  text = text.replace(/^#{1,6}\s+/gm, "");
  // 行頭の引用 >
  text = text.replace(/^\s*>\s?/gm, "");
  // 行頭のリストマーカー - * + または 1.
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  // 水平線
  text = text.replace(/^\s*(-{3,}|_{3,}|\*{3,})\s*$/gm, "");
  // 強調 **bold** / __bold__ / *italic* / _italic_ / ~~strike~~
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1");
  text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  // 連続空白・改行を 1 個の空白に圧縮
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
