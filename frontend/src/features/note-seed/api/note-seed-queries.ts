import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  bulkGenerateCandidates,
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
import { cardKeys } from "@/entities/card/api/card-keys";

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
    mutationFn: (input: { id: number; deleteCards?: boolean }) =>
      deleteNoteSeed(input.id, input.deleteCards ?? false),
    onSuccess: (deletedCards) => {
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
      // カードを併せて削除した場合は、カード一覧・復習キュー・
      // ダッシュボードの集計も古くなるため再取得させる。
      if (deletedCards > 0) {
        qc.invalidateQueries({ queryKey: cardKeys.all });
        qc.invalidateQueries({ queryKey: ["review"] });
        qc.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}

/**
 * 複数メモを一括で AI 生成キューに投入する。
 * 完了後はメモ一覧と各メモの generation status を invalidate して再取得させる。
 */
export function useBulkGenerateNoteSeeds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      noteSeedIds: number[];
      domain_template_id?: number | null;
    }) =>
      bulkGenerateCandidates(input.noteSeedIds, {
        domain_template_id: input.domain_template_id,
      }),
    onSuccess: () => {
      // メモ一覧 (生成バッジ更新) と各メモの generation status を更新
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
      qc.invalidateQueries({ queryKey: ["ai-candidates"] });
    },
  });
}
