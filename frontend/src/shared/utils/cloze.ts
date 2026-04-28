/**
 * Anki 風 cloze 記法 `{{cN::xxx}}` の処理ユーティリティ。
 *
 * 仕様:
 *   - N は 1 以上の任意桁数の数字 (c1 / c10 / c123)
 *   - xxx は `}` を含まない任意の文字列。空でも構文上はマッチするが、
 *     空中括弧 `{{c1::}}` は AI プロンプトで禁止されており、ヘルパー側でも
 *     空文字としてそのまま透過する (UI 側で fallback 表示する想定)。
 */

export const CLOZE_RE = /\{\{c\d+::([^}]*)\}\}/g;

/**
 * テキストから cloze の答え (xxx 部分) を出現順で抽出する。
 * - 空中括弧 `{{c1::}}` は空文字として配列に含まれる (呼び出し側で filter する想定)。
 * - 同じ N が複数あっても全件返す。
 */
export function extractClozeAnswers(text: string): string[] {
  if (text === "") return [];
  const answers: string[] = [];
  for (const match of text.matchAll(CLOZE_RE)) {
    answers.push(match[1] ?? "");
  }
  return answers;
}

/**
 * `{{cN::xxx}}` を `xxx` に置換した平文を返す。
 * 一覧プレビュー等、伏字せずに「中身が見える」表示が欲しい所で使う。
 */
export function stripClozeMarkers(text: string): string {
  return text.replace(CLOZE_RE, (_, inner) => String(inner ?? ""));
}
