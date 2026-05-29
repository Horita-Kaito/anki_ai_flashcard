import { describe, expect, it } from "vitest";
import { sendChatMessageSchema } from "./chat-schemas";

describe("sendChatMessageSchema", () => {
  it("空白だけの質問を拒否する", () => {
    expect(sendChatMessageSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  it("4000文字の質問を許可する", () => {
    expect(sendChatMessageSchema.safeParse({ content: "a".repeat(4000) }).success).toBe(true);
  });
});
