"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useNoteSeedInfiniteList } from "../api/note-seed-queries";
import { NoteSeedListItem } from "./note-seed-list-item";
import { NoteSeedListEmpty } from "./note-seed-list-empty";
import { NoteSeedListSkeleton } from "./note-seed-list-skeleton";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import { Button } from "@/shared/ui/button";

export function NoteSeedList() {
  const [keyword, setKeyword] = useState("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [onlyNoAttempt, setOnlyNoAttempt] = useState(false);
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const filters = {
    q: debouncedKeyword || undefined,
    domain_template_id: templateId === "" ? undefined : Number(templateId),
    generation_status: onlyNoAttempt ? ("no-attempt" as const) : undefined,
  };

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNoteSeedInfiniteList(filters);
  const { data: templates } = useDomainTemplateList();

  const notes = useMemo(
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

  const hasActiveFilter = keyword !== "" || templateId !== "" || onlyNoAttempt;

  function resetFilters() {
    setKeyword("");
    setTemplateId("");
    setOnlyNoAttempt(false);
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
            placeholder="メモ本文・学習目的で検索"
            className="w-full border rounded-md pl-10 pr-3 py-2.5 text-base md:text-sm min-h-11"
            aria-label="キーワード検索"
          />
        </div>

        <select
          value={templateId}
          onChange={(e) =>
            setTemplateId(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
          aria-label="テンプレートで絞り込み"
        >
          <option value="">すべてのテンプレート</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 min-h-11 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyNoAttempt}
            onChange={(e) => setOnlyNoAttempt(e.target.checked)}
            className="size-4 rounded border-input accent-primary cursor-pointer"
          />
          <span className="text-sm">未生成のメモのみ表示</span>
        </label>

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
        <NoteSeedListSkeleton />
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
      ) : notes.length === 0 ? (
        hasActiveFilter ? (
          <p className="text-sm text-muted-foreground p-4 text-center">
            該当するメモが見つかりません
          </p>
        ) : (
          <NoteSeedListEmpty />
        )
      ) : (
        <>
          <p
            className="text-xs text-muted-foreground"
            aria-live="polite"
          >
            {notes.length} / {total} 件
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {notes.map((note) => (
              <NoteSeedListItem key={note.id} note={note} />
            ))}
          </ul>
          {/* sentinel + 次ページ読み込みインジケータ */}
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
          {!hasNextPage && notes.length >= 20 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              すべて表示しました
            </p>
          )}
        </>
      )}
    </div>
  );
}
