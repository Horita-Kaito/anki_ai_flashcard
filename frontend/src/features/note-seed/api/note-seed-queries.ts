import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createNoteSeed,
  deleteNoteSeed,
  fetchNoteSeedList,
  updateNoteSeed,
  type NoteSeedListFilters,
} from "./endpoints";
import type {
  CreateNoteSeedInput,
  UpdateNoteSeedInput,
} from "../schemas/note-seed-schemas";
import { noteSeedKeys as entityNoteSeedKeys } from "@/entities/note-seed/api/note-seed-queries";

// Re-export entity-level read hook for cross-feature consumption
export { useNoteSeed } from "@/entities/note-seed/api/note-seed-queries";

export const noteSeedKeys = {
  ...entityNoteSeedKeys,
  list: (filters: NoteSeedListFilters = {}) =>
    [...entityNoteSeedKeys.all, "list", filters] as const,
};

/**
 * ページネーションを内部に隠した無限スクロール対応のメモ一覧 hook。
 * 戻り値の `pages` を flat 化して並べ、`hasNextPage` の間 sentinel で `fetchNextPage` を呼ぶ。
 */
export function useNoteSeedInfiniteList(filters: NoteSeedListFilters = {}) {
  return useInfiniteQuery({
    queryKey: noteSeedKeys.list(filters),
    queryFn: ({ pageParam }) => fetchNoteSeedList(pageParam, 20, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.meta;
      return current_page < last_page ? current_page + 1 : undefined;
    },
  });
}

export function useCreateNoteSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteSeedInput) => createNoteSeed(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteSeedKeys.all }),
  });
}

export function useUpdateNoteSeed(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNoteSeedInput) => updateNoteSeed(id, input),
    onSuccess: (data) => {
      qc.setQueryData(noteSeedKeys.detail(id), data);
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
    },
  });
}

export function useDeleteNoteSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNoteSeed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: noteSeedKeys.all }),
  });
}
