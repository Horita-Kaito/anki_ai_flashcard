"use client";

import Link from "next/link";
import { CheckCircle2, NotebookPen, Sparkles, Wand2 } from "lucide-react";
import type { NoteSeed } from "@/entities/note-seed/types";
import { stripMarkdown } from "@/shared/lib/strip-markdown";
import { Badge } from "@/shared/ui/badge";

interface NoteSeedListItemProps {
  note: NoteSeed;
  /** 一括選択モードかどうか。true でチェックボックス表示 + クリックで選択 toggle */
  selectable?: boolean;
  /** 一括選択モード時の選択状態 */
  selected?: boolean;
  /** 一括選択モード時の toggle ハンドラ */
  onToggleSelect?: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function NoteSeedListItem({
  note,
  selectable = false,
  selected = false,
  onToggleSelect,
}: NoteSeedListItemProps) {
  const pending = note.candidates_pending_count ?? 0;
  const adopted = note.candidates_adopted_count ?? 0;
  const attempts = note.generation_attempts_count ?? 0;
  // 生成依頼を受けた事があるか。失敗のみのメモも「依頼済み」として扱う。
  const hasAttempt = attempts > 0 || pending > 0 || adopted > 0;
  const preview = stripMarkdown(note.body);

  // 一括選択モードでは Link ではなく button として動作させ、誤遷移を防ぐ
  const wrapperClass = `group relative z-0 flex h-40 items-start gap-3 rounded-lg border bg-card p-4 hover:z-10 hover:bg-muted/50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors ${
    selectable && selected
      ? "border-primary ring-2 ring-primary/30 bg-primary/5"
      : ""
  } ${selectable ? "cursor-pointer" : ""}`;

  const inner = (
    <>
      {selectable ? (
        <span
          aria-hidden
          className={`flex size-10 items-center justify-center rounded-lg shrink-0 transition-colors ${
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {selected ? <CheckCircle2 className="size-5" /> : <NotebookPen className="size-5" />}
        </span>
      ) : (
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0"
        >
          <NotebookPen className="size-5" />
        </span>
      )}
      <span className="flex h-full min-w-0 flex-1 flex-col gap-2">
        <span className="knowledge-text block min-h-0 flex-1 overflow-hidden text-sm line-clamp-2 break-words">
          {preview}
        </span>
        <NoteSeedStatusBadges
          pending={pending}
          adopted={adopted}
          hasAttempt={hasAttempt}
        />
        <span className="mt-auto flex min-w-0 gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">{formatDate(note.created_at)}</span>
          {note.subdomain && <span className="truncate">#{note.subdomain}</span>}
        </span>
      </span>
    </>
  );

  if (selectable) {
    return (
      <li className="h-40">
        <button
          type="button"
          onClick={onToggleSelect}
          className={`${wrapperClass} w-full text-left`}
          role="checkbox"
          aria-checked={selected}
          aria-label={`メモ ${preview.slice(0, 30)} を選択`}
        >
          {inner}
        </button>
      </li>
    );
  }

  return (
    <li className="h-40">
      <Link
        href={`/notes/${note.id}`}
        className={wrapperClass}
        aria-label={`メモ ${preview.slice(0, 30)} を開く`}
      >
        {inner}
      </Link>
    </li>
  );
}

interface StatusBadgesProps {
  pending: number;
  adopted: number;
  hasAttempt: boolean;
}

function NoteSeedStatusBadges({
  pending,
  adopted,
  hasAttempt,
}: StatusBadgesProps) {
  if (!hasAttempt) {
    return (
      <span className="relative z-10 inline-flex max-w-full">
        <Badge variant="outline" className="border-dashed">
          <Wand2 aria-hidden />
          <span className="truncate">未生成</span>
        </Badge>
      </span>
    );
  }

  return (
    <span className="relative z-10 flex min-h-6 max-w-full shrink-0 flex-wrap gap-1.5">
      {pending > 0 ? (
        <Badge variant="attention">
          <Sparkles aria-hidden />
          レビュー待ち {pending}
        </Badge>
      ) : null}
      {adopted > 0 ? (
        <Badge variant="success">
          <CheckCircle2 aria-hidden />
          採用 {adopted}
        </Badge>
      ) : null}
      {pending === 0 && adopted === 0 ? (
        <Badge variant="secondary">生成済み</Badge>
      ) : null}
    </span>
  );
}
