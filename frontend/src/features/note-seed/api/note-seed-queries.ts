import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createNoteSeed,
  deleteNoteSeed,
  fetchNoteSeed,
  fetchNoteSeedList,
  updateNoteSeed,
  type NoteSeedListFilters,
} from "./endpoints";
import type {
  CreateNoteSeedInput,
  UpdateNoteSeedInput,
} from "../schemas/note-seed-schemas";

export const noteSeedKeys = {
  all: ["note-seeds"] as const,
  list: (page = 1, filters: NoteSeedListFilters = {}) =>
    [...noteSeedKeys.all, "list", page, filters] as const,
  detail: (id: number) => [...noteSeedKeys.all, "detail", id] as const,
};

export function useNoteSeedList(page = 1, filters: NoteSeedListFilters = {}) {
  return useQuery({
    queryKey: noteSeedKeys.list(page, filters),
    queryFn: () => fetchNoteSeedList(page, 20, filters),
  });
}

export function useNoteSeed(id: number) {
  return useQuery({
    queryKey: noteSeedKeys.detail(id),
    queryFn: () => fetchNoteSeed(id),
    enabled: Number.isFinite(id) && id > 0,
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
