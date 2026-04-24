import { useQuery } from "@tanstack/react-query";
import { fetchDeck, fetchDeckList } from "./endpoints";

export const deckKeys = {
  all: ["decks"] as const,
  list: () => [...deckKeys.all, "list"] as const,
  detail: (id: number) => [...deckKeys.all, "detail", id] as const,
};

/**
 * デッキ一覧 (全件、フラット配列)。階層構造は parent_id / display_order から
 * フロント側で組み立てる。
 */
export function useDeckList() {
  return useQuery({
    queryKey: deckKeys.list(),
    queryFn: () => fetchDeckList(),
  });
}

export function useDeck(id: number) {
  return useQuery({
    queryKey: deckKeys.detail(id),
    queryFn: () => fetchDeck(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
