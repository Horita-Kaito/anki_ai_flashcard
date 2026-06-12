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

  const hasPendingActivity = pendingUserMessage !== null || isAssistantThinking;

  return (
    <>
      {messages.length === 0 && !hasPendingActivity ? (
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
        "flex gap-4 py-2",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role === "assistant" && <AssistantAvatar />}
      
      {message.role === "user" ? (
        <div className="max-w-[85%] md:max-w-[70%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0 py-1 text-sm text-foreground leading-relaxed">
          <MarkdownText text={message.content} />
        </div>
      )}
      
      {message.role === "user" && <UserAvatar />}
    </article>
  );
}

interface PendingUserBubbleProps {
  content: string;
}

function PendingUserBubble({ content }: PendingUserBubbleProps) {
  return (
    <article className="flex justify-end gap-4 py-2 opacity-80">
      <div className="max-w-[85%] md:max-w-[70%] rounded-2xl bg-muted px-4 py-2.5 text-sm text-foreground">
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
      <UserAvatar />
    </article>
  );
}

function AssistantThinkingBubble() {
  return (
    <article className="flex gap-4 py-2" role="status" aria-live="polite">
      <AssistantAvatar active />
      <div className="flex-1 min-w-0 py-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="thinking-dot animate-bounce" />
            <span className="thinking-dot animate-bounce [animation-delay:140ms]" />
            <span className="thinking-dot animate-bounce [animation-delay:280ms]" />
          </div>
          <span>回答を組み立てています</span>
        </div>
        <div className="mt-3 space-y-2 max-w-md" aria-hidden>
          <div className="h-2 w-full rounded-full shimmer bg-muted" />
          <div className="h-2 w-2/3 rounded-full shimmer bg-muted" />
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
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
        active && "subtle-bob ring-2 ring-primary/15"
      )}
    >
      <Bot className="size-4" aria-hidden />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-border text-muted-foreground">
      <UserRound className="size-4" aria-hidden />
    </div>
  );
}
