"use client";

import Link from "next/link";
import { Archive, CalendarClock, Layers, Pencil, X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";

const ICON_BUTTON =
  "inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ReviewHeaderProps {
  completed: number;
  total: number;
  remaining: number;
  currentCardId: number;
  onArchive: () => void;
  archiveDisabled: boolean;
  /** 集中復習中のデッキ名 (deckId 指定時) */
  deckName?: string;
  isDeckScoped: boolean;
  /** 追加(閲覧)モード中かどうか */
  extraMode: boolean;
  /** 追加モードのカードが何日後に出題予定か */
  daysUntilDue?: number;
}

/**
 * 復習セッションの最小ヘッダー。
 * 集中を優先し「細い進捗バー + 残枚数 + 終了/編集/アーカイブ導線」だけに絞る。
 */
export function ReviewHeader({
  completed,
  total,
  remaining,
  currentCardId,
  onArchive,
  archiveDisabled,
  deckName,
  isDeckScoped,
  extraMode,
  daysUntilDue,
}: ReviewHeaderProps) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <header className="mx-auto w-full max-w-2xl shrink-0 space-y-2 pb-3 md:pb-4">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          aria-label="復習を終了してダッシュボードへ"
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} min-h-11 shrink-0 text-muted-foreground`}
        >
          <X data-icon="inline-start" aria-hidden />
          終了
        </Link>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1.5">
          {isDeckScoped && (
            <Badge variant="success" className="min-w-0 max-w-full">
              <Layers aria-hidden />
              <span className="truncate">
                {deckName ? `${deckName} を集中復習` : "デッキを集中復習"}
              </span>
              <Link
                href="/review"
                className="ml-0.5 rounded-full px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="集中復習を解除"
              >
                <X className="size-3" aria-hidden />
              </Link>
            </Badge>
          )}
          {extraMode && (
            <Badge variant="warning">
              <CalendarClock aria-hidden />
              閲覧モード
            </Badge>
          )}
          {extraMode && daysUntilDue !== undefined && (
            <Badge variant="outline">{daysUntilDue}日後に出題予定</Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href={`/cards/${currentCardId}?next=/review`}
            aria-label="このカードを編集"
            className={ICON_BUTTON}
          >
            <Pencil className="size-4" aria-hidden />
          </Link>
          <button
            type="button"
            aria-label="このカードをアーカイブ"
            disabled={archiveDisabled}
            onClick={onArchive}
            className={`${ICON_BUTTON} disabled:pointer-events-none disabled:opacity-40`}
          >
            <Archive className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="復習の進捗"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          残り {remaining} 枚
        </span>
      </div>
    </header>
  );
}
