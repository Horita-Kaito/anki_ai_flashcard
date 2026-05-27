"use client";

import { useCreateTag, useTagList } from "@/entities/tag/api/tag-queries";
import { TagPicker as EntityTagPicker } from "@/entities/tag/ui/tag-picker";

interface TagPickerProps {
  value: number[];
  onChange: (ids: number[]) => void;
  label?: string;
}

/**
 * tag feature 内で使う TagPicker のラッパ。useCreateTag を内部で持ち、
 * 親に mutation を意識させない。
 */
export function TagPicker({ value, onChange, label }: TagPickerProps) {
  const { data: tags = [] } = useTagList();
  const createTag = useCreateTag();

  return (
    <EntityTagPicker
      tags={tags}
      value={value}
      onChange={onChange}
      label={label}
      onCreateTag={(name) => createTag.mutateAsync(name)}
      isCreating={createTag.isPending}
    />
  );
}
