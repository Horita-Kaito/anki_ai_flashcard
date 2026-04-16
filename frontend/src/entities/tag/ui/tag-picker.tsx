"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useTagList } from "@/entities/tag/api/tag-queries";
import { Button } from "@/shared/ui/button";

interface TagPickerProps {
  value: number[];
  onChange: (ids: number[]) => void;
  onCreateTag?: (name: string) => Promise<{ id: number }>;
  isCreating?: boolean;
  label?: string;
}

/**
 * タグ選択 UI (entities 層)。
 * 既存タグをチップで表示し、onCreateTag が渡されれば新規タグも作成可能。
 */
export function TagPicker({
  value,
  onChange,
  onCreateTag,
  isCreating = false,
  label = "タグ",
}: TagPickerProps) {
  const { data: tags = [] } = useTagList();
  const [newTagName, setNewTagName] = useState("");

  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  async function handleCreate() {
    const name = newTagName.trim();
    if (!name || !onCreateTag) return;
    try {
      const tag = await onCreateTag(name);
      onChange([...value, tag.id]);
      setNewTagName("");
    } catch {
      // noop (既存名等)
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const selected = value.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                aria-pressed={selected}
                className={`
                  inline-flex items-center gap-1 px-3 py-2 min-h-11 rounded-full text-sm border
                  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }
                `}
              >
                {selected && <X className="size-3" aria-hidden />}
                {tag.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          タグはまだありません。下で作成してください。
        </p>
      )}

      {onCreateTag && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="新しいタグ名"
            className="flex-1 border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={handleCreate}
            disabled={isCreating || !newTagName.trim()}
          >
            追加
          </Button>
        </div>
      )}
    </fieldset>
  );
}
