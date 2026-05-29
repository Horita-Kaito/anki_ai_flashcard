"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
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
  const deleteSession = useDeleteChatSession();
  const materialize = useMaterializeChatNotes(selectedId);
  const [content, setContent] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [materializedSessionIds, setMaterializedSessionIds] = useState<Set<number>>(
    () => new Set()
  );

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

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    event.preventDefault();
    void submitMessage();
  }

  async function handleMaterialize() {
    try {
      const result = await materialize.mutateAsync();
      const noteCount = result.notes.length;
      const generated = result.dispatched.length;
      onMaterialized?.(result);
      if (selectedId !== null) {
        setMaterializedSessionIds((ids) => new Set(ids).add(selectedId));
      }
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
    }
  }

  const messages = activeSession?.messages ?? [];
  const canMaterialize = messages.some((message) => message.role === "assistant");
  const isMaterializedSession =
    selectedId !== null && materializedSessionIds.has(selectedId);

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <ChatSessionList
        sessions={sessions}
        activeId={activeId}
        isLoading={sessionsLoading}
        isCreating={createSession.isPending}
        deletingId={deleteSession.isPending ? (deleteSession.variables ?? null) : null}
        onCreate={handleNewChat}
        onSelect={setActiveId}
        onDelete={handleDeleteChat}
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
              disabled={
                !canMaterialize ||
                isMaterializedSession ||
                materialize.isPending ||
                sendMessage.isPending
              }
            >
              {materialize.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-4" aria-hidden />
              )}
              {isMaterializedSession ? "カード化済み" : CHAT_MATERIALIZE_LABEL}
            </Button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <ChatMessageList
              messages={messages}
              isLoading={sessionLoading}
              pendingUserMessage={pendingPrompt}
              isAssistantThinking={sendMessage.isPending && pendingPrompt !== null}
            />
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3 pb-28 md:pb-3">
            <div className="flex gap-2">
              <textarea
                aria-label="質問"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={handleComposerKeyDown}
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
