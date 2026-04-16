import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  list: (page = 1, filters: NoteSeedListFilters = {}) =>
    [...entityNoteSeedKeys.all, "list", page, filters] as const,
};

export function useNoteSeedList(page = 1, filters: NoteSeedListFilters = {}) {
  return useQuery({
    queryKey: noteSeedKeys.list(page, filters),
    queryFn: () => fetchNoteSeedList(page, 20, filters),
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
