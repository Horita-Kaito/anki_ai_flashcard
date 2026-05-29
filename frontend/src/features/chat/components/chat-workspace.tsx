"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
  useChatSession,
  useChatSessions,
  useCreateChatSession,
  useMaterializeChatNotes,
  useSendChatMessage,
} from "../api/chat-queries";
import { CHAT_MATERIALIZE_LABEL } from "../constants";
import { ChatMessageList } from "./chat-message-list";
import { ChatSessionList } from "./chat-session-list";
import type { MaterializeChatNotesResult } from "../api/endpoints";

interface ChatWorkspaceProps {
  onMaterialized?: (result: MaterializeChatNotesResult) => void;
}

export function ChatWorkspace({ onMaterialized }: ChatWorkspaceProps) {
  const { data: sessionsPage, isLoading: sessionsLoading } = useChatSessions();
  const createSession = useCreateChatSession();
  const [activeId, setActiveId] = useState<number | null>(null);
  const sessions = useMemo(() => sessionsPage?.data ?? [], [sessionsPage?.data]);
  const selectedId = activeId ?? sessions[0]?.id ?? null;
  const { data: activeSession, isLoading: sessionLoading } = useChatSession(selectedId);
  const sendMessage = useSendChatMessage(activeId);
  const materialize = useMaterializeChatNotes(selectedId);
  const [content, setContent] = useState("");

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
    const trimmed = content.trim();
    if (!trimmed) return;

    let sessionId = selectedId;
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
      setContent("");
    } catch {
      toast.error("送信に失敗しました");
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

  const messages = activeSession?.messages ?? [];
  const canMaterialize = messages.some((message) => message.role === "assistant");

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <ChatSessionList
        sessions={sessions}
        activeId={activeId}
        isLoading={sessionsLoading}
        isCreating={createSession.isPending}
        onCreate={handleNewChat}
        onSelect={setActiveId}
      />

      <section className="min-h-[70dvh] rounded-lg border bg-background">
        <div className="flex min-h-[70dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">
                {activeSession?.title ?? "学習チャット"}
              </h2>
              <p className="text-xs text-muted-foreground">
                質問して理解を深め、必要な学びだけメモ化します。
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11"
              onClick={handleMaterialize}
              disabled={!canMaterialize || materialize.isPending}
            >
              {materialize.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              {CHAT_MATERIALIZE_LABEL}
            </Button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <ChatMessageList
              messages={messages}
              isLoading={sessionLoading}
              materializeResult={materialize.data}
            />
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3">
            <div className="flex gap-2">
              <textarea
                aria-label="質問"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="質問を入力"
                rows={2}
                className="min-h-16 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button
                type="submit"
                size="icon-lg"
                className="min-h-11 min-w-11 self-end"
                disabled={sendMessage.isPending || createSession.isPending || content.trim() === ""}
                aria-label="送信"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
