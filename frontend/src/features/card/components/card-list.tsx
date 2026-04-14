"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useCardList } from "../api/card-queries";
import { CardListItem } from "./card-list-item";
import { CardListEmpty } from "./card-list-empty";
import { useDeckList } from "@/features/deck";
import { useTagList } from "@/features/tag";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { Button } from "@/shared/ui/button";

export function CardList() {
  const [keyword, setKeyword] = useState("");
  const [deckId, setDeckId] = useState<number | "">("");
  const [tagId, setTagId] = useState<number | "">("");
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const filters = {
    q: debouncedKeyword || undefined,
    deck_id: deckId === "" ? undefined : Number(deckId),
    tag_id: tagId === "" ? undefined : Number(tagId),
  };

  const { data, isLoading, isError, refetch } = useCardList(1, filters);
  const { data: decks } = useDeckList();
  const { data: tags } = useTagList();

  const hasActiveFilter = keyword !== "" || deckId !== "" || tagId !== "";

  function resetFilters() {
    setKeyword("");
    setDeckId("");
    setTagId("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="キーワードで検索 (問題/回答/補足)"
            className="w-full border rounded-md pl-10 pr-3 py-2.5 text-base md:text-sm min-h-11"
            aria-label="キーワード検索"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value === "" ? "" : Number(e.target.value))}
            className="border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
            aria-label="デッキで絞り込み"
          >
            <option value="">すべてのデッキ</option>
            {decks?.data.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={tagId}
            onChange={(e) => setTagId(e.target.value === "" ? "" : Number(e.target.value))}
            className="border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
            aria-label="タグで絞り込み"
          >
            <option value="">すべてのタグ</option>
            {tags?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilter && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="min-h-11"
          >
            <X className="size-4" aria-hidden />
            絞り込みをクリア
          </Button>
        )}
      </div>

      {isLoading ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="h-24 border rounded-xl bg-muted/30 animate-pulse"
              aria-hidden
            />
          ))}
        </ul>
      ) : isError ? (
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
      ) : !data?.data.length ? (
        hasActiveFilter ? (
          <p className="text-sm text-muted-foreground p-4 text-center">
            該当するカードが見つかりません
          </p>
        ) : (
          <CardListEmpty />
        )
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {data.data.map((c) => (
            <CardListItem key={c.id} card={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
