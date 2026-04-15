"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GenerateCandidatesView } from "@/features/ai-candidate";

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
        <Link
          href={`/notes/${noteSeedId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2 min-h-11"
        >
          <ArrowLeft className="size-4" aria-hidden />
          メモに戻る
        </Link>

        <header>
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
