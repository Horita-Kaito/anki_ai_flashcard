"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  NoteSeedForm,
  useNoteSeed,
  useDeleteNoteSeed,
} from "@/features/note-seed";
import { Button } from "@/shared/ui/button";
import { BackHeader } from "@/shared/ui/back-header";

export default function NoteEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const noteId = Number(id);
  const { data: note, isLoading, isError } = useNoteSeed(noteId);
  const deleteMutation = useDeleteNoteSeed();

  async function handleDelete() {
    if (!note) return;
    if (!confirm("このメモを削除しますか？")) return;
    try {
      await deleteMutation.mutateAsync(note.id);
      toast.success("メモを削除しました");
      router.push("/notes");
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </main>
    );
  }

  if (isError || !note) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <p>メモが見つかりません</p>
        <Button
          onClick={() => router.push("/notes")}
          size="lg"
          className="min-h-11"
        >
          一覧へ
        </Button>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <BackHeader title="メモを編集" />
        <header className="hidden md:block space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">メモを編集</h1>
        </header>

        <section
          aria-labelledby="ai-action"
          className="border rounded-xl p-4 md:p-5 space-y-2 bg-primary/5"
        >
          <h2
            id="ai-action"
            className="text-sm font-medium flex items-center gap-2"
          >
            AI でカード候補を生成
          </h2>
          <p className="text-sm text-muted-foreground">
            このメモから AI が複数のカード候補を提案します
          </p>
          <Button
            onClick={() => router.push(`/notes/${note.id}/generate`)}
            size="lg"
            className="min-h-11"
          >
            候補を生成する
          </Button>
        </section>

        <NoteSeedForm note={note} />

        <section
          aria-labelledby="danger-zone"
          className="border border-destructive/30 rounded-xl p-4 md:p-5 space-y-3"
        >
          <h2
            id="danger-zone"
            className="text-sm font-medium text-destructive"
          >
            危険な操作
          </h2>
          <p className="text-sm text-muted-foreground">
            このメモから生成された AI 候補もすべて削除されます (カード採用済みは残ります)。
          </p>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="min-h-11"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "削除中..." : "メモを削除"}
          </Button>
        </section>
      </div>
    </main>
  );
}
