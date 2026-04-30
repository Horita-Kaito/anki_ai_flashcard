"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useCardInfiniteList } from "../api/card-queries";
import { CardListItem } from "./card-list-item";
import { CardListEmpty } from "./card-list-empty";
import { CardListSkeleton } from "./card-list-skeleton";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { buildHierarchicalOptions } from "@/shared/lib/deck-tree";
import { useTagList } from "@/entities/tag/api/tag-queries";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import { Button } from "@/shared/ui/button";

type ArchiveFilter = "active" | "archived";

interface CardListProps {
  /** 指定時はそのデッキのカードに固定して絞り込み、デッキ select を非表示にする */
  lockedDeckId?: number;
}

export function CardList({ lockedDeckId }: CardListProps = {}) {
  const [keyword, setKeyword] = useState("");
  const [deckId, setDeckId] = useState<number | "">(lockedDeckId ?? "");
  const [tagId, setTagId] = useState<number | "">("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const effectiveDeckId = lockedDeckId ?? (deckId === "" ? undefined : Number(deckId));
  const filters = {
    q: debouncedKeyword || undefined,
    deck_id: effectiveDeckId,
    tag_id: tagId === "" ? undefined : Number(tagId),
    archived: archiveFilter === "archived" ? true : false,
  };

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCardInfiniteList(filters);
  const { data: decks } = useDeckList();
  const deckOptions = buildHierarchicalOptions(decks ?? []);
  const { data: tags } = useTagList();

  const cards = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  );
  const total = data?.pages[0]?.meta.total ?? 0;

  const sentinelRef = useInfiniteScroll({
    onLoadMore: () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    enabled: !!hasNextPage && !isFetchingNextPage,
  });

  const hasActiveFilter =
    keyword !== "" ||
    (lockedDeckId === undefined && deckId !== "") ||
    tagId !== "" ||
    archiveFilter !== "active";

  function resetFilters() {
    setKeyword("");
    if (lockedDeckId === undefined) setDeckId("");
    setTagId("");
    setArchiveFilter("active");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={archiveFilter === "active"}
            onClick={() => setArchiveFilter("active")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-11 ${
              archiveFilter === "active"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            学習中
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={archiveFilter === "archived"}
            onClick={() => setArchiveFilter("archived")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-11 ${
              archiveFilter === "archived"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            アーカイブ済み
          </button>
        </div>

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

        <div
          className={`grid gap-2 ${
            lockedDeckId === undefined ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {lockedDeckId === undefined && (
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value === "" ? "" : Number(e.target.value))}
              className="border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
              aria-label="デッキで絞り込み"
            >
              <option value="">すべてのデッキ</option>
              {deckOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {"— ".repeat(opt.depth)}
                  {opt.name}
                </option>
              ))}
            </select>
          )}
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
        <CardListSkeleton />
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
      ) : cards.length === 0 ? (
        hasActiveFilter ? (
          <p className="text-sm text-muted-foreground p-4 text-center">
            該当するカードが見つかりません
          </p>
        ) : (
          <CardListEmpty />
        )
      ) : (
        <>
          <p
            className="text-xs text-muted-foreground"
            aria-live="polite"
          >
            {cards.length} / {total} 件
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {cards.map((card) => (
              <CardListItem key={card.id} card={card} />
            ))}
          </ul>
          <div ref={sentinelRef} aria-hidden className="h-1" />
          {isFetchingNextPage && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-3"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              読み込み中...
            </div>
          )}
          {!hasNextPage && cards.length >= 20 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              すべて表示しました
            </p>
          )}
        </>
      )}
    </div>
  );
}
