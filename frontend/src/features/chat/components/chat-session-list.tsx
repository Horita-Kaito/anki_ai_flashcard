"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { cn } from "@/shared/lib/utils";
import type { ChatSession } from "@/entities/chat/types";

interface ChatSessionListProps {
  sessions: ChatSession[];
  activeId: number | null;
  isLoading: boolean;
  isCreating: boolean;
  deletingId?: number | null;
  onCreate: () => void;
  onSelect: (id: number) => void;
  onDelete: (id: number) => Promise<void>;
  footer?: ReactNode;
}

export function ChatSessionList({
  sessions,
  activeId,
  isLoading,
  isCreating,
  deletingId = null,
  onCreate,
  onSelect,
  onDelete,
  footer,
}: ChatSessionListProps) {
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const selectedId = activeId ?? sessions[0]?.id ?? null;

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // 親コンポーネント側で toast を出す。失敗時は確認ダイアログを閉じない。
    }
  }

  return (
    <aside className="flex max-h-48 min-h-0 flex-col gap-2 rounded-xl border bg-sidebar p-2 md:h-full md:max-h-none md:rounded-none md:border-0 md:border-r md:p-3">
      <ConfirmDialog
        open={deleteTarget !== null}
        title="チャットを削除"
        description="このチャットはメモ化せずに削除されます。削除後は元に戻せません。"
        confirmLabel="削除する"
        variant="destructive"
        loading={deletingId === deleteTarget?.id}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="min-h-11 w-full justify-start gap-3 px-3"
        onClick={onCreate}
        disabled={isCreating}
      >
        <MessageSquarePlus className="size-4" aria-hidden />
        新しいチャット
      </Button>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg p-1">
        {isLoading ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">読み込み中...</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">まだチャットはありません。</p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => (
              <li key={session.id}>
                <div
                  className={cn(
                    "group flex min-h-11 items-stretch rounded-md transition-colors",
                    selectedId === session.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(session.id)}
                    className={cn(
                      "min-w-0 flex-1 rounded-l-md px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring",
                      selectedId === session.id && "font-medium"
                    )}
                  >
                    <span className="line-clamp-2">{session.title ?? "学習チャット"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(session)}
                    disabled={deletingId === session.id}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-r-md text-muted-foreground opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                    aria-label={`${session.title ?? "学習チャット"}を削除`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {footer ? <div className="hidden shrink-0 md:block">{footer}</div> : null}
    </aside>
  );
}
