"use client";

import { useDeckList } from "../api/deck-queries";
import { DeckListItem } from "./deck-list-item";
import { DeckListEmpty } from "./deck-list-empty";

/**
 * デッキ一覧コンテナ。
 * Server 状態は TanStack Query、モバイルは1列、md+ は 2列、lg+ は 3列。
 */
export function DeckList() {
  const { data, isLoading, isError, refetch } = useDeckList();

  if (isLoading) {
    return (
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="h-16 border rounded-xl bg-muted/30 animate-pulse"
            aria-hidden
          />
        ))}
      </ul>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="border border-destructive/30 bg-destructive/5 rounded-xl p-4 space-y-2"
      >
        <p className="font-medium text-destructive">読み込みに失敗しました</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm underline underline-offset-2 min-h-11"
        >
          再試行
        </button>
      </div>
    );
  }

  const decks = data?.data ?? [];

  if (decks.length === 0) {
    return <DeckListEmpty />;
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {decks.map((deck) => (
        <DeckListItem key={deck.id} deck={deck} />
      ))}
    </ul>
  );
}
