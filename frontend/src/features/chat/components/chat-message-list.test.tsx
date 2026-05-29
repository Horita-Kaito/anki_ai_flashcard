import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessageList } from "./chat-message-list";
import type { ChatMessage } from "@/entities/chat/types";

const assistantMessage: ChatMessage = {
  id: 1,
  chat_session_id: 10,
  role: "assistant",
  content: "これは回答です。",
  metadata: null,
  created_at: null,
  updated_at: null,
};

describe("ChatMessageList", () => {
  it("AI 応答待ちの間、ユーザー入力と思考中表示を描画する", () => {
    render(
      <ChatMessageList
        messages={[assistantMessage]}
        isLoading={false}
        pendingUserMessage="量子化とは?"
        isAssistantThinking
      />
    );

    expect(screen.getByText("量子化とは?")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("回答を組み立てています");
  });
});
