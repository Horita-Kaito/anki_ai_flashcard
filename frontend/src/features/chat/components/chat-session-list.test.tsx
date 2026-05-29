import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatSessionList } from "./chat-session-list";
import type { ChatSession } from "@/entities/chat/types";

const session: ChatSession = {
  id: 12,
  title: "HTTP キャッシュ",
  domain_template_id: null,
  deck_id: null,
  messages_count: 2,
  created_at: null,
  updated_at: null,
};

describe("ChatSessionList", () => {
  it("確認後にチャット削除を実行する", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);

    render(
      <ChatSessionList
        sessions={[session]}
        activeId={session.id}
        isLoading={false}
        isCreating={false}
        onCreate={vi.fn()}
        onSelect={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: "HTTP キャッシュを削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(onDelete).toHaveBeenCalledWith(session.id);
  });

  it("削除に失敗した場合は確認ダイアログを閉じない", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error("failed"));

    render(
      <ChatSessionList
        sessions={[session]}
        activeId={session.id}
        isLoading={false}
        isCreating={false}
        onCreate={vi.fn()}
        onSelect={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: "HTTP キャッシュを削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
