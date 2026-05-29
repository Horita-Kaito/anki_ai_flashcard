import type { Metadata } from "next";
import { ChatPageClient } from "./chat-page-client";

export const metadata: Metadata = {
  title: "チャット | まとメモAI",
};

export default function ChatPage() {
  return <ChatPageClient />;
}
