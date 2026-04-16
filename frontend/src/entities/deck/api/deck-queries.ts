import { useQuery } from "@tanstack/react-query";
import { fetchDeck, fetchDeckList } from "./endpoints";

export const deckKeys = {
  all: ["decks"] as const,
  list: (page = 1) => [...deckKeys.all, "list", page] as const,
  detail: (id: number) => [...deckKeys.all, "detail", id] as const,
};

export function useDeckList(page = 1) {
  return useQuery({
    queryKey: deckKeys.list(page),
    queryFn: () => fetchDeckList(page),
  });
}

export function useDeck(id: number) {
  return useQuery({
    queryKey: deckKeys.detail(id),
    queryFn: () => fetchDeck(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}
