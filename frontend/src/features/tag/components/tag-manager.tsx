"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTagList, useCreateTag, useDeleteTag } from "../api/tag-queries";
import { Button } from "@/shared/ui/button";

export function TagManager() {
  const { data: tags = [], isLoading } = useTagList();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [newTagName, setNewTagName] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    try {
      await createTag.mutateAsync(name);
      setNewTagName("");
      toast.success("タグを追加しました");
    } catch {
      toast.error("追加に失敗しました (重複?)");
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`タグ「${name}」を削除しますか? カードとの紐付けも解除されます`)) {
      return;
    }
    try {
      await deleteTag.mutateAsync(id);
      toast.success("タグを削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-2" aria-label="タグ追加フォーム">
        <label htmlFor="new-tag" className="text-sm font-medium">
          新しいタグ
        </label>
        <div className="flex gap-2">
          <input
            id="new-tag"
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="例: 設計パターン"
            className="flex-1 border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          />
          <Button
            type="submit"
            className="min-h-11"
            disabled={createTag.isPending || !newTagName.trim()}
          >
            追加
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          登録済みタグ ({tags.length})
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">タグはまだありません</p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between gap-2 border rounded-xl p-3 bg-card"
              >
                <span className="text-sm font-medium truncate">{tag.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(tag.id, tag.name)}
                  disabled={deleteTag.isPending}
                  aria-label={`タグ ${tag.name} を削除`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
