/**
 * カード種別 (バックエンドの CardType Enum と対応)
 */
export const CARD_TYPES = [
  "basic_qa",
  "comparison",
  "practical_case",
  "cloze_like",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  basic_qa: "基本Q&A",
  comparison: "比較",
  practical_case: "実務ケース",
  cloze_like: "穴埋め (将来)",
};
