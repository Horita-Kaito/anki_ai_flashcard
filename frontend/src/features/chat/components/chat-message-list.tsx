"use client";

import Link from "next/link";
import { Bot, UserRound } from "lucide-react";
import { MarkdownText } from "@/shared/ui/markdown-text";
import { cn } from "@/shared/lib/utils";
import type { ChatMessage } from "@/entities/chat/types";
import type { MaterializeChatNotesResult } from "../api/endpoints";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  materializeResult?: MaterializeChatNotesResult;
}

export function ChatMessageList({
  messages,
  isLoading,
  materializeResult,
}: ChatMessageListProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">読み込み中...</p>;
  }

  return (
    <>
      {messages.length === 0 ? (
        <div className="grid min-h-64 place-items-center text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-base font-medium">知りたいことを質問してください</p>
            <p className="text-sm text-muted-foreground">
              回答から残したい学びをメモ化し、そのままカード候補生成へ進めます。
            </p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <article
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bot className="size-4" aria-hidden />
              </div>
            )}
            <div
              className={cn(
                "max-w-[min(42rem,85%)] rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.role === "assistant" ? (
                <MarkdownText text={message.content} />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}
            </div>
            {message.role === "user" && (
              <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <UserRound className="size-4" aria-hidden />
              </div>
            )}
          </article>
        ))
      )}

      {materializeResult && materializeResult.notes.length > 0 && (
        <div className="rounded-lg border bg-[var(--forest-faint)] p-3 text-sm">
          <p className="font-medium">
            {materializeResult.notes.length}件のメモを作成しました。
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {materializeResult.notes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="min-h-11 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
              >
                メモ #{note.id}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
