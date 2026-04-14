import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createTag, deleteTag, fetchTagList } from "./endpoints";

export const tagKeys = {
  all: ["tags"] as const,
  list: () => [...tagKeys.all, "list"] as const,
};

export function useTagList() {
  return useQuery({
    queryKey: tagKeys.list(),
    queryFn: fetchTagList,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createTag(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
  });
}
