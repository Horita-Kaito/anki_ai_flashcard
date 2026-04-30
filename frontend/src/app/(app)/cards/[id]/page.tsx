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
import { BackHeader } from "@/shared/ui/back-header";
import { SchedulerBadge } from "@/shared/ui/scheduler-badge";

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
        <BackHeader title="カードを編集" />
        <header className="hidden md:block space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">カードを編集</h1>
            <SchedulerBadge scheduler={card.scheduler} />
          </div>
          {card.schedule && (
            <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              <span>状態: {card.schedule.state}</span>
              <span>復習回数: {card.schedule.repetitions}</span>
              <span>間隔: {card.schedule.interval_days} 日</span>
              {card.scheduler === "fsrs" && card.schedule.stability !== null && (
                <span>安定度: {card.schedule.stability.toFixed(1)} 日</span>
              )}
              {card.scheduler === "fsrs" && card.schedule.difficulty !== null && (
                <span>難度: {card.schedule.difficulty.toFixed(1)} / 10</span>
              )}
              {card.scheduler === "sm2" && card.schedule.ease_factor !== null && (
                <span>EF: {card.schedule.ease_factor.toFixed(2)}</span>
              )}
            </div>
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
