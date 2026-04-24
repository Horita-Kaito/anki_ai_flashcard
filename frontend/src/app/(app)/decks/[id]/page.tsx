"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useDeck, useDeleteDeck, DeckForm } from "@/features/deck";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { CardList } from "@/features/card";
import { Button } from "@/shared/ui/button";
import { BackHeader } from "@/shared/ui/back-header";

export default function DeckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const deckId = Number(id);
  const { data: deck, isLoading, isError } = useDeck(deckId);
  const { data: allDecks } = useDeckList();
  const deleteMutation = useDeleteDeck();
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function handleDelete() {
    if (!deck) return;
    if (!confirm(`デッキ「${deck.name}」を削除しますか?`)) return;
    try {
      await deleteMutation.mutateAsync(deck.id);
      toast.success("デッキを削除しました");
      router.push("/decks");
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        toast.error("子デッキがあるため削除できません。先に子デッキを移動または削除してください");
      } else {
        toast.error("削除に失敗しました");
      }
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

  // breadcrumb (ルートから自身まで)
  const breadcrumb: string[] = [];
  if (allDecks) {
    const byId = new Map(allDecks.map((d) => [d.id, d] as const));
    let cursor = deck;
    const safety = 20;
    for (let i = 0; i < safety && cursor; i++) {
      breadcrumb.unshift(cursor.name);
      if (cursor.parent_id === null) break;
      const parent = byId.get(cursor.parent_id);
      if (!parent) break;
      cursor = parent;
    }
  } else {
    breadcrumb.push(deck.name);
  }

  const parentDeck =
    deck.parent_id !== null ? allDecks?.find((d) => d.id === deck.parent_id) : null;

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6 pb-8">
        <BackHeader title="デッキ" />

        {/* デッキヘッダ */}
        <section
          aria-labelledby="deck-header"
          className="border rounded-xl p-4 md:p-5 space-y-3 bg-muted/20"
        >
          {editing ? (
            <>
              <h2 id="deck-header" className="text-sm font-medium">
                デッキを編集
              </h2>
              <DeckForm
                deck={deck}
                redirectTo={`/decks/${deck.id}`}
              />
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  className="min-h-9"
                >
                  閉じる
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  {breadcrumb.length > 1 && (
                    <p
                      id="deck-header"
                      className="text-xs text-muted-foreground truncate"
                      aria-label="階層パス"
                    >
                      {breadcrumb.slice(0, -1).join(" / ")} /
                    </p>
                  )}
                  <h1 className="text-xl md:text-2xl font-bold truncate">
                    {deck.name}
                  </h1>
                  {parentDeck && (
                    <p className="text-xs text-muted-foreground">
                      親デッキ:{" "}
                      <Link
                        href={`/decks/${parentDeck.id}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {parentDeck.name}
                      </Link>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-8"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  編集
                </button>
              </div>

              {deck.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                  {deck.description}
                </p>
              )}

              {/* 詳細 (折りたたみ) */}
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-8"
                aria-expanded={detailsOpen}
              >
                {detailsOpen ? (
                  <ChevronDown className="size-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden />
                )}
                詳細設定・削除
              </button>

              {detailsOpen && (
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-destructive">
                    デッキを削除するとカードと学習履歴もすべて失われます (子デッキが無い場合のみ削除可能)。
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="min-h-9"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "削除中..." : "このデッキを削除"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* カード一覧 (このデッキ + 子孫にはここではフォールしない、純粋にこのデッキのカードのみ) */}
        {!editing && (
          <section aria-labelledby="cards-header" className="space-y-3">
            <h2 id="cards-header" className="font-medium">
              カード一覧
            </h2>
            <CardList lockedDeckId={deck.id} />
          </section>
        )}
      </div>
    </main>
  );
}
