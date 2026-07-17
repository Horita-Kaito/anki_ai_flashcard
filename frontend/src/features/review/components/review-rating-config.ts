import type { ReviewRating } from "@/entities/review/types";

/**
 * 復習評価ボタンの見た目・文言設定。
 * 評価バー (review-action-bar) と完了サマリー (review-complete) で共有する。
 *
 * 色は落ち着いたブランドトーンで 4 段階を区別する:
 * - again = persimmon 系 (覚え直し)
 * - hard  = bronze 系 (迷い)
 * - good  = forest 系 (標準)
 * - easy  = primary (余裕)
 */
export const RATING_BUTTON_CLASSES: Record<ReviewRating, string> = {
  again:
    "border-[color-mix(in_oklch,var(--persimmon),transparent_50%)] bg-[var(--persimmon-faint)] text-[var(--persimmon)] hover:bg-[color-mix(in_oklch,var(--persimmon-soft),transparent_35%)]",
  hard: "border-[color-mix(in_oklch,var(--bronze),transparent_50%)] bg-[var(--bronze-faint)] text-[var(--bronze)] hover:bg-[color-mix(in_oklch,var(--bronze-soft),transparent_30%)]",
  good: "border-[color-mix(in_oklch,var(--forest),transparent_55%)] bg-[var(--forest-faint)] text-[var(--forest)] hover:bg-[color-mix(in_oklch,var(--forest-soft),transparent_35%)]",
  easy: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
};

/** 完了サマリーのチップ色。ボタンより淡いトーン */
export const RATING_SUMMARY_CLASSES: Record<ReviewRating, string> = {
  again: "bg-[var(--persimmon-faint)] text-[var(--persimmon)]",
  hard: "bg-[var(--bronze-faint)] text-[var(--bronze)]",
  good: "bg-[var(--forest-faint)] text-[var(--forest)]",
  easy: "bg-primary/10 text-primary",
};

/** ボタン内の主ラベル (行動そのまま) */
export const RATING_DISPLAY_LABELS: Record<ReviewRating, string> = {
  again: "もう一度",
  hard: "難しい",
  good: "できた",
  easy: "簡単",
};

/** 補助説明。aria-label にも使うため簡潔な語を保つ */
export const RATING_DESCRIPTIONS: Record<ReviewRating, string> = {
  again: "覚え直す",
  hard: "迷った",
  good: "標準",
  easy: "余裕",
};
