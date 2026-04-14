"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CardForm,
  useCard,
  useDeleteCard,
} from "@/features/card";
import { Button } from "@/shared/ui/button";

export default function CardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const cardId = Number(id);
  const { data: card, isLoading, isError } = useCard(cardId);
  const deleteMutation = useDeleteCard();

  async function handleDelete() {
    if (!card) return;
    if (!confirm("このカードを削除しますか？学習履歴も消えます")) return;
    try {
      await deleteMutation.mutateAsync(card.id);
      toast.success("カードを削除しました");
      router.push("/cards");
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

  if (isError || !card) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <p>カードが見つかりません</p>
        <Button
          onClick={() => router.push("/cards")}
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
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">カードを編集</h1>
          {card.schedule && (
            <p className="text-sm text-muted-foreground">
              状態: {card.schedule.state} / 復習回数: {card.schedule.repetitions}
            </p>
          )}
        </header>

        <CardForm card={card} />

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
            このカードと学習履歴がすべて削除されます。
          </p>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="min-h-11"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "削除中..." : "カードを削除"}
          </Button>
        </section>
      </div>
    </main>
  );
}
