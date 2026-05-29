import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatComposer } from "./chat-composer";

describe("ChatComposer", () => {
  it("Enter で送信し、Shift+Enter は送信しない", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onChange = vi.fn();

    render(
      <ChatComposer
        value="CMS とは?"
        isSending={false}
        isCreating={false}
        onChange={onChange}
        onSubmit={onSubmit}
      />
    );

    const textarea = screen.getByRole("textbox", { name: "質問" });

    await user.click(textarea);
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("日本語変換中の Enter では送信しない", () => {
    const onSubmit = vi.fn();

    render(
      <ChatComposer
        value="漢字"
        isSending={false}
        isCreating={false}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const textarea = screen.getByRole("textbox", { name: "質問" });
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        isComposing: true,
      })
    );

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
