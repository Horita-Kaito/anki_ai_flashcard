"use client";

import Link from "next/link";
import { CheckCircle2, NotebookPen, Sparkles, Wand2 } from "lucide-react";
import type { NoteSeed } from "@/entities/note-seed/types";
import { stripMarkdown } from "@/shared/lib/strip-markdown";

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
  const wrapperClass = `group flex items-start gap-3 border rounded-xl p-4 min-h-16 bg-card hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors ${
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
      <span className="flex-1 min-w-0 space-y-2">
        <span className="block text-sm line-clamp-2 break-words">{preview}</span>
        <NoteSeedStatusBadges
          pending={pending}
          adopted={adopted}
          hasAttempt={hasAttempt}
        />
        <span className="flex gap-3 text-xs text-muted-foreground">
          <span>{formatDate(note.created_at)}</span>
          {note.subdomain && <span>#{note.subdomain}</span>}
        </span>
      </span>
    </>
  );

  if (selectable) {
    return (
      <li>
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
    <li>
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
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-2 py-0.5 text-xs text-muted-foreground">
        <Wand2 className="size-3" aria-hidden />
        未生成
      </span>
    );
  }

  return (
    <span className="flex flex-wrap gap-1.5">
      {pending > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
          <Sparkles className="size-3" aria-hidden />
          レビュー待ち {pending}
        </span>
      ) : null}
      {adopted > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs font-medium">
          <CheckCircle2 className="size-3" aria-hidden />
          採用 {adopted}
        </span>
      ) : null}
      {pending === 0 && adopted === 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          生成済み
        </span>
      ) : null}
    </span>
  );
}
