"use client";

import { use } from "react";
import { GenerateCandidatesView } from "@/features/ai-candidate";
import { BackHeader } from "@/shared/ui/back-header";

export default function GenerateCandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const noteSeedId = Number(id);

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <BackHeader title="AI 候補生成" />

        <header className="hidden md:block">
          <h1 className="text-2xl md:text-3xl font-bold">AI 候補生成</h1>
          <p className="text-sm text-muted-foreground mt-1">
            メモからフラッシュカード候補を AI が提案します
          </p>
        </header>

        <GenerateCandidatesView noteSeedId={noteSeedId} />
      </div>
    </main>
  );
}
