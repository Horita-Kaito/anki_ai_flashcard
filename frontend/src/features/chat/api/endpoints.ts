import { apiClient, fetchCsrfCookie } from "@/shared/api/client";
import {
  parseApiDataResponse,
  parseApiListResponse,
  parseApiResponse,
} from "@/shared/api/parse-response";
import { paginatedResponseSchema } from "@/shared/types/pagination-schema";
import type { PaginatedResponse } from "@/shared/types/pagination";
import type { NoteSeed } from "@/entities/note-seed/types";
import { noteSeedResponseSchema } from "@/entities/note-seed/schemas";
import {
  chatCardizationBatchSchema,
  chatMessageSchema,
  chatSessionSchema,
} from "@/entities/chat/schemas";
import type {
  ChatCardizationBatch,
  ChatMessage,
  ChatSession,
} from "@/entities/chat/types";
import type {
  CreateChatSessionInput,
  SendChatMessageInput,
} from "../schemas/chat-schemas";

const paginatedChatSessionSchema = paginatedResponseSchema(chatSessionSchema);
const paginatedChatCardizationBatchSchema = paginatedResponseSchema(
  chatCardizationBatchSchema
);

export async function fetchChatSessions(
  page = 1,
  perPage = 20
): Promise<PaginatedResponse<ChatSession>> {
  const res = await apiClient.get("/chats", {
    params: { page, per_page: perPage },
  });
  return parseApiResponse(paginatedChatSessionSchema, res.data);
}

export async function createChatSession(
  input: CreateChatSessionInput = {}
): Promise<ChatSession> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: ChatSession }>("/chats", input);
  return parseApiDataResponse(chatSessionSchema, res);
}

export async function fetchChatSession(id: number): Promise<ChatSession> {
  const res = await apiClient.get(`/chats/${id}`);
  return parseApiDataResponse(chatSessionSchema, res);
}

export async function deleteChatSession(id: number): Promise<void> {
  await fetchCsrfCookie();
  await apiClient.delete(`/chats/${id}`);
}

export async function sendChatMessage(
  chatSessionId: number,
  input: SendChatMessageInput
): Promise<{ user_message: ChatMessage; assistant_message: ChatMessage }> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{
    data: { user_message: ChatMessage; assistant_message: ChatMessage };
  }>(`/chats/${chatSessionId}/messages`, input);
  return {
    user_message: chatMessageSchema.parse(res.data.data.user_message),
    assistant_message: chatMessageSchema.parse(res.data.data.assistant_message),
  };
}

export interface MaterializeChatNotesResult {
  notes: NoteSeed[];
  dispatched: Array<{ note_seed_id: number; log_id: number; status: string }>;
  skipped: Array<{ note_seed_id: number; reason: string; existing_log_id?: number }>;
  failed: Array<{ note_seed_id: number; reason: string; code?: string }>;
  chat_session_deleted: boolean;
  batch: ChatCardizationBatch;
}

export async function materializeChatNotes(
  chatSessionId: number,
  input: { domain_template_id?: number | null; deck_id?: number | null } = {}
): Promise<MaterializeChatNotesResult> {
  await fetchCsrfCookie();
  const res = await apiClient.post<{ data: MaterializeChatNotesResult }>(
    `/chats/${chatSessionId}/materialize-notes`,
    input
  );
  return {
    ...res.data.data,
    batch: chatCardizationBatchSchema.parse(res.data.data.batch),
    notes: parseApiListResponse(noteSeedResponseSchema, {
      data: { data: res.data.data.notes },
    }),
  };
}

export async function fetchChatCardizationBatches(
  page = 1,
  perPage = 5
): Promise<PaginatedResponse<ChatCardizationBatch>> {
  const res = await apiClient.get("/chat-cardization-batches", {
    params: { page, per_page: perPage },
  });
  return parseApiResponse(paginatedChatCardizationBatchSchema, res.data);
}

export async function fetchChatCardizationBatch(
  id: number
): Promise<ChatCardizationBatch & { notes: NoteSeed[] }> {
  const res = await apiClient.get(`/chat-cardization-batches/${id}`);
  const data = res.data.data;

  return {
    ...chatCardizationBatchSchema.parse(data),
    notes: parseApiListResponse(noteSeedResponseSchema, {
      data: { data: data.notes ?? [] },
    }),
  };
}
