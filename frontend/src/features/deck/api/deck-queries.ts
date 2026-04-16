import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeck, deleteDeck, reorderDecks, updateDeck } from "./endpoints";
import type {
  CreateDeckInput,
  UpdateDeckInput,
} from "../schemas/deck-schemas";
import { deckKeys } from "@/entities/deck/api/deck-queries";

// Re-export entity-level read hooks for internal feature use
export { useDeckList, useDeck, deckKeys } from "@/entities/deck/api/deck-queries";

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeckInput) => createDeck(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deckKeys.all });
    },
  });
}

export function useUpdateDeck(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDeckInput) => updateDeck(id, input),
    onSuccess: (data) => {
      qc.setQueryData(deckKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: deckKeys.all });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDeck(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deckKeys.all });
    },
  });
}

export function useReorderDecks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deckIds: number[]) => reorderDecks(deckIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deckKeys.all });
    },
  });
}
