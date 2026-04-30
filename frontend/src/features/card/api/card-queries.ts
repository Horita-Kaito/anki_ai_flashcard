import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  archiveCard,
  createCard,
  deleteCard,
  fetchCard,
  fetchCardList,
  unarchiveCard,
  updateCard,
  type CardListFilters,
} from "./endpoints";
import type {
  CreateCardInput,
  UpdateCardInput,
} from "../schemas/card-schemas";
import { cardKeys } from "@/entities/card/api/card-keys";

// cross-feature で参照される invalidation 用に re-export
export { cardKeys };

/**
 * 無限スクロール対応のカード一覧 hook。
 */
export function useCardInfiniteList(filters: CardListFilters = {}) {
  return useInfiniteQuery({
    queryKey: cardKeys.list(filters),
    queryFn: ({ pageParam }) => fetchCardList(pageParam, 20, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta;
      return current_page < last_page ? current_page + 1 : undefined;
    },
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

export function useArchiveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => archiveCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardKeys.all });
      qc.invalidateQueries({ queryKey: ["review"] });
    },
  });
}

export function useUnarchiveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unarchiveCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardKeys.all });
      qc.invalidateQueries({ queryKey: ["review"] });
    },
  });
}
