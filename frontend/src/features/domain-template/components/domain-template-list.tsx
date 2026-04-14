"use client";

import { useDomainTemplateList } from "../api/domain-template-queries";
import { DomainTemplateListItem } from "./domain-template-list-item";
import { DomainTemplateListEmpty } from "./domain-template-list-empty";

export function DomainTemplateList() {
  const { data, isLoading, isError, refetch } = useDomainTemplateList();

  if (isLoading) {
    return (
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="h-20 border rounded-xl bg-muted/30 animate-pulse"
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

  const templates = data ?? [];

  if (templates.length === 0) {
    return <DomainTemplateListEmpty />;
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {templates.map((template) => (
        <DomainTemplateListItem key={template.id} template={template} />
      ))}
    </ul>
  );
}
