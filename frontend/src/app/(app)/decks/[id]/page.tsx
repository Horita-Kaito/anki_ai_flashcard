"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDeck, useDeleteDeck, DeckForm } from "@/features/deck";
import { Button } from "@/shared/ui/button";

export default function DeckEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const deckId = Number(id);
  const { data: deck, isLoading, isError } = useDeck(deckId);
  const deleteMutation = useDeleteDeck();

  async function handleDelete() {
    if (!deck) return;
    if (!confirm(`デッキ「${deck.name}」を削除しますか？`)) return;
    try {
      await deleteMutation.mutateAsync(deck.id);
      toast.success("デッキを削除しました");
      router.push("/decks");
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

  if (isError || !deck) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <p>デッキが見つかりません</p>
        <Button onClick={() => router.push("/decks")} size="lg" className="min-h-11">
          デッキ一覧へ
        </Button>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">デッキを編集</h1>
          <p className="text-sm text-muted-foreground break-all">{deck.name}</p>
        </header>

        <DeckForm deck={deck} redirectTo="/decks" />

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
            このデッキ内のカードと学習履歴もすべて削除されます。
          </p>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="min-h-11"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "削除中..." : "デッキを削除"}
          </Button>
        </section>
      </div>
    </main>
  );
}
