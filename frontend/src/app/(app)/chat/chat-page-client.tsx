"use client";

import { useState } from "react";
import { ChatWorkspace } from "@/features/chat";
import type { MaterializeChatNotesResult } from "@/features/chat/api/endpoints";
import { PageShell } from "@/shared/ui/page-shell";
import { ChatCandidateReview } from "@/widgets/chat-cardization/chat-candidate-review";

export function ChatPageClient() {
  const [materialized, setMaterialized] =
    useState<MaterializeChatNotesResult | null>(null);

  return (
    <PageShell
      title="チャット"
      description="質問から得た学びをメモ化し、カード候補生成までつなげます。"
    >
      <div className="space-y-6">
        <ChatWorkspace onMaterialized={setMaterialized} />
        {materialized && <ChatCandidateReview notes={materialized.notes} />}
      </div>
    </PageShell>
  );
}
