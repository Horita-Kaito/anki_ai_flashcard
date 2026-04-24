"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useCardList } from "../api/card-queries";
import { CardListItem } from "./card-list-item";
import { CardListEmpty } from "./card-list-empty";
import { CardListSkeleton } from "./card-list-skeleton";
import { useDeckList } from "@/entities/deck/api/deck-queries";
import { buildHierarchicalOptions } from "@/features/deck/lib/deck-tree";
import { useTagList } from "@/entities/tag/api/tag-queries";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { Button } from "@/shared/ui/button";
import { VirtualList } from "@/shared/ui/virtual-list";
import type { Card } from "@/entities/card/types";

type ArchiveFilter = "active" | "archived";

export function CardList() {
  const [keyword, setKeyword] = useState("");
  const [deckId, setDeckId] = useState<number | "">("");
  const [tagId, setTagId] = useState<number | "">("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const filters = {
    q: debouncedKeyword || undefined,
    deck_id: deckId === "" ? undefined : Number(deckId),
    tag_id: tagId === "" ? undefined : Number(tagId),
    archived: archiveFilter === "archived" ? true : false,
  };

  const { data, isLoading, isError, refetch } = useCardList(1, filters);
  const { data: decks } = useDeckList();
  const deckOptions = buildHierarchicalOptions(decks ?? []);
  const { data: tags } = useTagList();

  const hasActiveFilter = keyword !== "" || deckId !== "" || tagId !== "" || archiveFilter !== "active";

  function resetFilters() {
    setKeyword("");
    setDeckId("");
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
      ) : !data?.data.length ? (
        hasActiveFilter ? (
          <p className="text-sm text-muted-foreground p-4 text-center">
            該当するカードが見つかりません
          </p>
        ) : (
          <CardListEmpty />
        )
      ) : (
        <VirtualList<Card>
          items={data.data}
          estimateSize={120}
          getItemKey={(c) => c.id}
          renderItem={(c) => <CardListItem card={c} />}
          listClassName="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4"
        />
      )}
    </div>
  );
}
