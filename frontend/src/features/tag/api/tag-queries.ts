import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTag, deleteTag } from "./endpoints";
import { tagKeys } from "@/entities/tag/api/tag-queries";

// Re-export entity-level read hooks for internal feature use
export { useTagList, tagKeys } from "@/entities/tag/api/tag-queries";

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
