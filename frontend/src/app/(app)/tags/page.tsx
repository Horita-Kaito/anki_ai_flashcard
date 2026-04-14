import type { Metadata } from "next";
import { TagManager } from "@/features/tag";

export const metadata: Metadata = {
  title: "タグ管理 | Anki AI Flashcard",
};

export default function TagsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">タグ管理</h1>
          <p className="text-sm text-muted-foreground">
            カードの分類に使うタグを管理できます
          </p>
        </header>
        <TagManager />
      </div>
    </main>
  );
}
