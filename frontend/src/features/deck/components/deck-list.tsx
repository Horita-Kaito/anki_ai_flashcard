"use client";

import { useDeckList } from "../api/deck-queries";
import { DeckListEmpty } from "./deck-list-empty";
import { DeckListSkeleton } from "./deck-list-skeleton";
import { DeckSortableList } from "./deck-sortable-list";

/**
 * デッキ一覧コンテナ。
 * 並び順は DnD で変更可能 (display_order を保存)。
 * モバイル: 長押し(200ms)でドラッグ開始、PC: 6px ドラッグで開始。
 */
export function DeckList() {
  const { data, isLoading, isError, refetch } = useDeckList();

  if (isLoading) {
    return <DeckListSkeleton />;
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

  const decks = data ?? [];

  if (decks.length === 0) {
    return <DeckListEmpty />;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground hidden md:block">
        💡 左の handle をドラッグして並び順を変更できます
      </p>
      <DeckSortableList decks={decks} />
    </div>
  );
}
