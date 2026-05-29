export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: number;
  chat_session_id: number;
  role: ChatRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatSession {
  id: number;
  title: string | null;
  domain_template_id: number | null;
  deck_id: number | null;
  messages_count: number | null;
  messages?: ChatMessage[];
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatCardizationBatch {
  id: number;
  source_chat_session_id: number | null;
  source_chat_session_title: string | null;
  domain_template_id: number | null;
  deck_id: number | null;
  notes_count: number;
  dispatched_count: number;
  failed_count: number;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}
