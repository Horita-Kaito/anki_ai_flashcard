"use client";

import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import type { ChatSession } from "@/entities/chat/types";

interface ChatSessionListProps {
  sessions: ChatSession[];
  activeId: number | null;
  isLoading: boolean;
  isCreating: boolean;
  onCreate: () => void;
  onSelect: (id: number) => void;
}

export function ChatSessionList({
  sessions,
  activeId,
  isLoading,
  isCreating,
  onCreate,
  onSelect,
}: ChatSessionListProps) {
  const selectedId = activeId ?? sessions[0]?.id ?? null;

  return (
    <aside className="space-y-3 md:sticky md:top-4 md:self-start">
      <Button
        type="button"
        size="lg"
        className="min-h-11 w-full"
        onClick={onCreate}
        disabled={isCreating}
      >
        <MessageSquarePlus className="size-4" aria-hidden />
        新しいチャット
      </Button>
      <div className="rounded-lg border bg-background p-2">
        {isLoading ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">読み込み中...</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">まだチャットはありません。</p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onSelect(session.id)}
                  className={cn(
                    "min-h-11 w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selectedId === session.id
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span className="line-clamp-2">{session.title ?? "学習チャット"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
