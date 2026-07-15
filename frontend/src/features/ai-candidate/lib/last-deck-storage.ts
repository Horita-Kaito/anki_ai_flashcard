/**
 * 候補採用時に最後に選んだデッキを記憶する localStorage ヘルパー。
 * 「候補ごとに毎回デッキを選び直す」摩擦をなくすための sticky デフォルト。
 */
const STORAGE_KEY = "ai-candidate:last-deck-id";

export function readLastDeckId(): number | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeLastDeckId(deckId: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(deckId));
  } catch {
    // プライベートモード等で失敗しても致命的ではないため握りつぶす
  }
}
