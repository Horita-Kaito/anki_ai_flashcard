"use client";

import { Bot, UserRound } from "lucide-react";
import { MarkdownText } from "@/shared/ui/markdown-text";
import { cn } from "@/shared/lib/utils";
import type { ChatMessage } from "@/entities/chat/types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  pendingUserMessage?: string | null;
  isAssistantThinking?: boolean;
}

export function ChatMessageList({
  messages,
  isLoading,
  pendingUserMessage = null,
  isAssistantThinking = false,
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
        messages.map((message) => <MessageBubble key={message.id} message={message} />)
      )}

      {pendingUserMessage && (
        <PendingUserBubble content={pendingUserMessage} />
      )}

      {isAssistantThinking && <AssistantThinkingBubble />}
    </>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <article
      className={cn(
        "flex gap-3",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === "assistant" && <AssistantAvatar />}
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
      {message.role === "user" && <UserAvatar />}
    </article>
  );
}

interface PendingUserBubbleProps {
  content: string;
}

function PendingUserBubble({ content }: PendingUserBubbleProps) {
  return (
    <article className="flex justify-end gap-3 opacity-80">
      <div className="max-w-[min(42rem,85%)] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
      <UserAvatar />
    </article>
  );
}

function AssistantThinkingBubble() {
  return (
    <article className="flex gap-3" role="status" aria-live="polite">
      <AssistantAvatar active />
      <div className="max-w-[min(34rem,85%)] rounded-lg border bg-card px-3 py-3 text-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" aria-hidden>
            <span className="thinking-dot" />
            <span className="thinking-dot [animation-delay:140ms]" />
            <span className="thinking-dot [animation-delay:280ms]" />
          </div>
          <span className="text-muted-foreground">回答を組み立てています</span>
        </div>
        <div className="mt-3 space-y-1.5" aria-hidden>
          <div className="h-2 w-11/12 rounded-full shimmer" />
          <div className="h-2 w-7/12 rounded-full shimmer" />
        </div>
      </div>
    </article>
  );
}

interface AssistantAvatarProps {
  active?: boolean;
}

function AssistantAvatar({ active = false }: AssistantAvatarProps) {
  return (
    <div
      className={cn(
        "mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary",
        active && "subtle-bob ring-2 ring-primary/15"
      )}
    >
      <Bot className="size-4" aria-hidden />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <UserRound className="size-4" aria-hidden />
    </div>
  );
}
