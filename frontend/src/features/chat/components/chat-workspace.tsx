"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  useChatSession,
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
  useMaterializeChatNotes,
  useSendChatMessage,
} from "../api/chat-queries";
import { CHAT_MATERIALIZE_LABEL } from "../constants";
import { ChatComposer } from "./chat-composer";
import { ChatMessageList } from "./chat-message-list";
import { ChatSessionList } from "./chat-session-list";
import type { MaterializeChatNotesResult } from "../api/endpoints";

interface ChatWorkspaceProps {
  onMaterialized?: (result: MaterializeChatNotesResult) => void;
  sidebarFooter?: ReactNode;
}

export function ChatWorkspace({ onMaterialized, sidebarFooter }: ChatWorkspaceProps) {
  const { data: sessionsPage, isLoading: sessionsLoading } = useChatSessions();
  const createSession = useCreateChatSession();
  const [activeId, setActiveId] = useState<number | null>(null);
  const sessions = useMemo(() => sessionsPage?.data ?? [], [sessionsPage?.data]);
  const selectedId = activeId ?? sessions[0]?.id ?? null;
  const { data: activeSession, isLoading: sessionLoading } = useChatSession(selectedId);
  const sendMessage = useSendChatMessage(activeId);
  const deleteSession = useDeleteChatSession();
  const materialize = useMaterializeChatNotes(selectedId);
  const [content, setContent] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const messages = activeSession?.messages ?? [];
  const canMaterialize = messages.some((message) => message.role === "assistant");

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length, pendingPrompt, sendMessage.isPending, sessionLoading]);

  async function handleNewChat() {
    try {
      const session = await createSession.mutateAsync({});
      setActiveId(session.id);
      setContent("");
    } catch {
      toast.error("チャットの作成に失敗しました");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage();
  }

  async function submitMessage() {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (sendMessage.isPending || createSession.isPending) return;

    let sessionId = selectedId;
    setPendingPrompt(trimmed);
    setContent("");
    try {
      if (sessionId === null) {
        const session = await createSession.mutateAsync({
          title: trimmed.slice(0, 48),
        });
        sessionId = session.id;
        setActiveId(session.id);
      }
      await sendMessage.mutateAsync({
        input: { content: trimmed },
        overrideChatSessionId: sessionId,
      });
    } catch {
      setContent(trimmed);
      toast.error("送信に失敗しました");
    } finally {
      setPendingPrompt(null);
    }
  }

  async function handleMaterialize() {
    try {
      const result = await materialize.mutateAsync();
      const noteCount = result.notes.length;
      const generated = result.dispatched.length;
      onMaterialized?.(result);
      setActiveId(null);
      setContent("");
      toast.success(`${noteCount}件のメモを作成し、${generated}件の候補生成を開始しました`);
    } catch {
      toast.error("メモ化に失敗しました");
    }
  }

  async function handleDeleteChat(id: number) {
    try {
      await deleteSession.mutateAsync(id);
      if (id === selectedId) {
        setActiveId(null);
        setContent("");
      }
      toast.success("チャットを削除しました");
    } catch {
      toast.error("チャットの削除に失敗しました");
      throw new Error("Failed to delete chat session");
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)] md:gap-0">
      <ChatSessionList
        sessions={sessions}
        activeId={activeId}
        isLoading={sessionsLoading}
        isCreating={createSession.isPending}
        deletingId={deleteSession.isPending ? (deleteSession.variables ?? null) : null}
        onCreate={handleNewChat}
        onSelect={setActiveId}
        onDelete={handleDeleteChat}
        footer={sidebarFooter}
      />

      <section className="flex h-[75dvh] flex-col overflow-hidden border-t md:border-l md:border-t-0 md:pl-6">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-6 py-4 backdrop-blur-sm">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {activeSession?.title ?? "新しい学習チャット"}
            </h2>
            <p className="text-xs text-muted-foreground">
              質問して理解を深め、必要な学びだけメモ化します。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 shadow-sm gap-1.5"
            onClick={handleMaterialize}
            disabled={
              !canMaterialize ||
              materialize.isPending ||
              sendMessage.isPending
            }
          >
            {materialize.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-3.5 text-primary" aria-hidden />
            )}
            <span className="font-medium text-xs">{CHAT_MATERIALIZE_LABEL}</span>
          </Button>
        </header>

        <div ref={messagesRef} className="flex-1 overflow-y-auto bg-muted/5 py-6">
          <div className="mx-auto max-w-3xl w-full px-6 space-y-6">
            <ChatMessageList
              messages={messages}
              isLoading={sessionLoading}
              pendingUserMessage={pendingPrompt}
              isAssistantThinking={sendMessage.isPending && pendingPrompt !== null}
            />
          </div>
        </div>

        <div className="shrink-0 border-t bg-background/80 px-6 py-4 pb-28 md:pb-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl w-full">
            <ChatComposer
              value={content}
              isSending={sendMessage.isPending}
              isCreating={createSession.isPending}
              onChange={setContent}
              onSubmit={() => void submitMessage()}
            />
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              AIの回答から得た学びをメモ化して、フラッシュカードを作成できます。
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
