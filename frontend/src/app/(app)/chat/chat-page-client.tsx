"use client";

import { useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { ChatWorkspace } from "@/features/chat";
import type { MaterializeChatNotesResult } from "@/features/chat/api/endpoints";
import { PageShell } from "@/shared/ui/page-shell";
import { ChatCandidateReview } from "@/widgets/chat-cardization/chat-candidate-review";
import { Button } from "@/shared/ui/button";

export function ChatPageClient() {
  const [materialized, setMaterialized] =
    useState<MaterializeChatNotesResult | null>(null);
  const [isCandidatePanelOpen, setIsCandidatePanelOpen] = useState(false);

  function handleMaterialized(result: MaterializeChatNotesResult) {
    setMaterialized(result);
    setIsCandidatePanelOpen(true);
  }

  return (
    <PageShell
      title="チャット"
      description="質問から得た学びをメモ化し、カード候補生成までつなげます。"
      maxWidth="7xl"
    >
      <div
        className={
          materialized && isCandidatePanelOpen
            ? "grid items-start gap-4 pb-28 md:pb-0 xl:grid-cols-[minmax(0,1fr)_25rem]"
            : "pb-28 md:pb-0"
        }
      >
        <div className="space-y-3">
          <ChatWorkspace onMaterialized={handleMaterialized} />
          {materialized && !isCandidatePanelOpen && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-11"
                onClick={() => setIsCandidatePanelOpen(true)}
              >
                <PanelRightOpen className="size-4" aria-hidden />
                カード候補を開く
              </Button>
            </div>
          )}
        </div>
        {materialized && isCandidatePanelOpen && (
          <ChatCandidateReview
            notes={materialized.notes}
            onClose={() => setIsCandidatePanelOpen(false)}
          />
        )}
      </div>
    </PageShell>
  );
}
