import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createCard,
  deleteCard,
  fetchCard,
  fetchCardList,
  updateCard,
  type CardListFilters,
} from "./endpoints";
import type {
  CreateCardInput,
  UpdateCardInput,
} from "../schemas/card-schemas";

export const cardKeys = {
  all: ["cards"] as const,
  list: (page = 1, filters: CardListFilters = {}) =>
    [...cardKeys.all, "list", page, filters] as const,
  detail: (id: number) => [...cardKeys.all, "detail", id] as const,
};

export function useCardList(page = 1, filters: CardListFilters = {}) {
  return useQuery({
    queryKey: cardKeys.list(page, filters),
    queryFn: () => fetchCardList(page, 20, filters),
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: cardKeys.detail(id),
    queryFn: () => fetchCard(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => createCard(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: cardKeys.all }),
  });
}

export function useUpdateCard(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCardInput) => updateCard(id, input),
    onSuccess: (data) => {
      qc.setQueryData(cardKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: cardKeys.all });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: cardKeys.all }),
  });
}
