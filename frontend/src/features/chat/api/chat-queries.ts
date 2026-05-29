import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatSession } from "@/entities/chat/types";
import { noteSeedKeys } from "@/entities/note-seed/api/note-seed-queries";
import type { PaginatedResponse } from "@/shared/types/pagination";
import {
  createChatSession,
  deleteChatSession,
  fetchChatSession,
  fetchChatSessions,
  materializeChatNotes,
  sendChatMessage,
  type MaterializeChatNotesResult,
} from "./endpoints";
import type {
  CreateChatSessionInput,
  SendChatMessageInput,
} from "../schemas/chat-schemas";

export const chatKeys = {
  all: ["chats"] as const,
  list: () => [...chatKeys.all, "list"] as const,
  detail: (id: number) => [...chatKeys.all, "detail", id] as const,
};

export function useChatSessions() {
  return useQuery({
    queryKey: chatKeys.list(),
    queryFn: () => fetchChatSessions(1, 20),
  });
}

export function useChatSession(id: number | null) {
  return useQuery({
    queryKey: chatKeys.detail(id ?? 0),
    queryFn: () => fetchChatSession(id ?? 0),
    enabled: id !== null && Number.isFinite(id) && id > 0,
  });
}

export function useCreateChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChatSessionInput = {}) => createChatSession(input),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: chatKeys.list() });
      qc.setQueryData(chatKeys.detail(session.id), session);
    },
  });
}

export function useDeleteChatSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteChatSession(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: chatKeys.detail(id) });
      qc.setQueryData<PaginatedResponse<ChatSession>>(chatKeys.list(), (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.filter((session) => session.id !== id),
          meta: {
            ...current.meta,
            total: Math.max(current.meta.total - 1, 0),
          },
        };
      });
      qc.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
}

export function useSendChatMessage(chatSessionId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      overrideChatSessionId,
    }: {
      input: SendChatMessageInput;
      overrideChatSessionId?: number;
    }) => {
      const id = overrideChatSessionId ?? chatSessionId;
      if (!id) throw new Error("チャットが選択されていません");
      return sendChatMessage(id, input);
    },
    onSuccess: (_data, variables) => {
      const id = variables.overrideChatSessionId ?? chatSessionId;
      if (id) {
        qc.invalidateQueries({ queryKey: chatKeys.detail(id) });
        qc.invalidateQueries({ queryKey: chatKeys.list() });
      }
    },
  });
}

export function useMaterializeChatNotes(chatSessionId: number | null) {
  const qc = useQueryClient();
  return useMutation<MaterializeChatNotesResult, Error, void>({
    mutationFn: () => {
      if (!chatSessionId) throw new Error("チャットが選択されていません");
      return materializeChatNotes(chatSessionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noteSeedKeys.all });
      if (chatSessionId) {
        qc.removeQueries({ queryKey: chatKeys.detail(chatSessionId) });
        qc.invalidateQueries({ queryKey: chatKeys.list() });
      }
    },
  });
}
