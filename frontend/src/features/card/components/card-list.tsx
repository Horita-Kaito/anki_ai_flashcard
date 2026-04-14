"use client";

import { useCardList } from "../api/card-queries";
import { CardListItem } from "./card-list-item";
import { CardListEmpty } from "./card-list-empty";

export function CardList() {
  const { data, isLoading, isError, refetch } = useCardList();

  if (isLoading) {
    return (
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="h-24 border rounded-xl bg-muted/30 animate-pulse"
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

  const cards = data?.data ?? [];
  if (cards.length === 0) return <CardListEmpty />;

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {cards.map((c) => (
        <CardListItem key={c.id} card={c} />
      ))}
    </ul>
  );
}
