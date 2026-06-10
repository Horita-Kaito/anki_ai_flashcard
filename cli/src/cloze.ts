/**
 * Anki 風 cloze 記法 `{{cN::xxx}}` のターミナル表示用ユーティリティ。
 * 仕様は frontend/src/shared/utils/cloze.ts と同一の正規表現に揃える。
 */
const CLOZE_RE = /\{\{c\d+::([^}]*)\}\}/g;

export function hasCloze(text: string): boolean {
  return new RegExp(CLOZE_RE.source).test(text);
}

/** 表面 (質問) 用: 答えを伏字にする */
export function maskCloze(text: string): string {
  return text.replace(CLOZE_RE, "【____】");
}

/** 裏面 (答え) 用: 答えを括弧で強調して埋め戻す */
export function revealCloze(text: string): string {
  return text.replace(CLOZE_RE, (_, inner: string) => `【${inner}】`);
}
