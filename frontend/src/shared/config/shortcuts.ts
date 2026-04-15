/**
 * アプリ全体のキーボードショートカット定義。
 * 単一の真実源: ShortcutHelpDialog と実装側の両方がこれを参照する。
 */

export interface ShortcutDef {
  keys: string[];
  description: string;
  scope: "global" | "review" | "candidate" | "list";
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  // グローバル
  { keys: ["⌘K", "Ctrl+K"], description: "コマンドパレット", scope: "global" },
  { keys: ["?"], description: "ショートカット一覧を表示", scope: "global" },
  { keys: ["Esc"], description: "ダイアログを閉じる", scope: "global" },

  // 復習
  { keys: ["Space", "Enter"], description: "答えを表示", scope: "review" },
  { keys: ["1"], description: "もう一度 (Again)", scope: "review" },
  { keys: ["2"], description: "難しい (Hard)", scope: "review" },
  { keys: ["3"], description: "普通 (Good)", scope: "review" },
  { keys: ["4"], description: "簡単 (Easy)", scope: "review" },

  // フォーム
  { keys: ["⌘Enter", "Ctrl+Enter"], description: "フォーム送信", scope: "global" },
] as const;

export const SHORTCUTS_BY_SCOPE: Record<ShortcutDef["scope"], ShortcutDef[]> = {
  global: SHORTCUTS.filter((s) => s.scope === "global"),
  review: SHORTCUTS.filter((s) => s.scope === "review"),
  candidate: SHORTCUTS.filter((s) => s.scope === "candidate"),
  list: SHORTCUTS.filter((s) => s.scope === "list"),
};

export const SCOPE_LABELS: Record<ShortcutDef["scope"], string> = {
  global: "全般",
  review: "復習",
  candidate: "AI 候補レビュー",
  list: "一覧",
};
