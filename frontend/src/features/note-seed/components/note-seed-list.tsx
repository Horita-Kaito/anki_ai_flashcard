"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useNoteSeedList } from "../api/note-seed-queries";
import { NoteSeedListItem } from "./note-seed-list-item";
import { NoteSeedListEmpty } from "./note-seed-list-empty";
import { NoteSeedListSkeleton } from "./note-seed-list-skeleton";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { Button } from "@/shared/ui/button";

export function NoteSeedList() {
  const [keyword, setKeyword] = useState("");
  const [templateId, setTemplateId] = useState<number | "">("");
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const filters = {
    q: debouncedKeyword || undefined,
    domain_template_id: templateId === "" ? undefined : Number(templateId),
  };

  const { data, isLoading, isError, refetch } = useNoteSeedList(1, filters);
  const { data: templates } = useDomainTemplateList();

  const hasActiveFilter = keyword !== "" || templateId !== "";

  function resetFilters() {
    setKeyword("");
    setTemplateId("");
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
      ) : !data?.data.length ? (
        hasActiveFilter ? (
          <p className="text-sm text-muted-foreground p-4 text-center">
            該当するメモが見つかりません
          </p>
        ) : (
          <NoteSeedListEmpty />
        )
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {data.data.map((note) => (
            <NoteSeedListItem key={note.id} note={note} />
          ))}
        </ul>
      )}
    </div>
  );
}
