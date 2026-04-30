"use client";

import { useMemo, useState } from "react";
import { CheckSquare, Loader2, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  useBulkGenerateNoteSeeds,
  useNoteSeedInfiniteList,
} from "../api/note-seed-queries";
import { NoteSeedListItem } from "./note-seed-list-item";
import { NoteSeedListEmpty } from "./note-seed-list-empty";
import { NoteSeedListSkeleton } from "./note-seed-list-skeleton";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

const BULK_LIMIT = 10;

export function NoteSeedList() {
  const [keyword, setKeyword] = useState("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const [onlyNoAttempt, setOnlyNoAttempt] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
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
  const bulkGenerate = useBulkGenerateNoteSeeds();

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
  const selectedCount = selectedIds.size;
  const reachedLimit = selectedCount >= BULK_LIMIT;

  function resetFilters() {
    setKeyword("");
    setTemplateId("");
    setOnlyNoAttempt(false);
  }

  function toggleSelect(noteId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        if (next.size >= BULK_LIMIT) {
          toast.warning(`選択は最大 ${BULK_LIMIT} 件までです`);
          return prev;
        }
        next.add(noteId);
      }
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkGenerate() {
    setConfirmOpen(false);
    const ids = Array.from(selectedIds);
    try {
      const result = await bulkGenerate.mutateAsync({ noteSeedIds: ids });
      const dispatched = result.dispatched.length;
      const skipped = result.skipped.length;
      const failed = result.failed.length;

      if (dispatched > 0) {
        toast.success(
          `${dispatched} 件の生成を開始しました。完了したら候補が表示されます`
        );
      }
      if (skipped > 0) {
        toast.warning(`${skipped} 件は既に生成中のためスキップしました`);
      }
      if (failed > 0) {
        const reason = result.failed[0]?.reason ?? "不明なエラー";
        toast.error(`${failed} 件が失敗: ${reason.slice(0, 60)}`);
      }
      exitSelectMode();
    } catch {
      toast.error("一括生成の開始に失敗しました");
    }
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

        <div className="flex flex-wrap items-center gap-2">
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
          {!selectMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectMode(true)}
              className="min-h-11"
            >
              <CheckSquare className="size-4" aria-hidden />
              複数選択して一括生成
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={exitSelectMode}
              className="min-h-11"
            >
              <X className="size-4" aria-hidden />
              選択を終了
            </Button>
          )}
        </div>
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
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {notes.length} / {total} 件
            {selectMode && (
              <span className="ml-2 text-primary">
                ({selectedCount} 件選択中{reachedLimit ? " / 上限到達" : ""})
              </span>
            )}
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {notes.map((note) => (
              <NoteSeedListItem
                key={note.id}
                note={note}
                selectable={selectMode}
                selected={selectedIds.has(note.id)}
                onToggleSelect={() => toggleSelect(note.id)}
              />
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

      {/* 一括生成 sticky bar (選択中のみ表示) */}
      {selectMode && selectedCount > 0 && (
        <div
          className="
            fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))]
            border-t bg-background/95 backdrop-blur z-30
            p-3
            md:static md:border-0 md:bg-transparent md:backdrop-blur-0 md:p-0
          "
          role="region"
          aria-label="一括生成バー"
        >
          <div className="flex items-center gap-2 max-w-3xl mx-auto md:max-w-none">
            <p className="flex-1 text-sm">
              <span className="font-semibold">{selectedCount} 件</span>
              <span className="text-muted-foreground ml-1">を選択中</span>
            </p>
            <Button
              type="button"
              size="lg"
              className="min-h-11"
              onClick={() => setConfirmOpen(true)}
              disabled={bulkGenerate.isPending}
            >
              <Sparkles className="size-4" aria-hidden />
              {bulkGenerate.isPending ? "送信中..." : "まとめて生成"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="まとめて AI 生成しますか？"
        description={
          <>
            選択した <strong>{selectedCount} 件</strong>{" "}
            のメモに対して AI 候補生成ジョブをまとめて投入します。
            生成中のメモは自動的にスキップされます。
            <br />
            <span className="block mt-2 text-xs">
              ※ AI 利用料が件数分発生します。完了後はカウンタとバッジが更新されます。
            </span>
          </>
        }
        confirmLabel={`${selectedCount} 件を生成開始`}
        variant="default"
        onConfirm={handleBulkGenerate}
        onCancel={() => setConfirmOpen(false)}
        loading={bulkGenerate.isPending}
      />
    </div>
  );
}
