import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDeck,
  deleteDeck,
  updateDeck,
  updateDeckTree,
  type DeckTreeNode,
} from "./endpoints";
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

export function useUpdateDeckTree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodes: DeckTreeNode[]) => updateDeckTree(nodes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deckKeys.all });
    },
  });
}
