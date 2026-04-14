import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createDeck,
  deleteDeck,
  fetchDeck,
  fetchDeckList,
  updateDeck,
} from "./endpoints";
import type {
  CreateDeckInput,
  UpdateDeckInput,
} from "../schemas/deck-schemas";

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
