import type { Metadata } from "next";
import { ReviewSession } from "@/features/review";

export const metadata: Metadata = {
  title: "復習 | Anki AI Flashcard",
};

export default function ReviewPage() {
  return (
    <main className="flex-1 p-4 md:p-8 pb-28 md:pb-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">復習セッション</h1>
          <p className="text-sm text-muted-foreground mt-1">
            PC: Space で答え表示、1〜4 で評価。モバイル: 下部ボタン
          </p>
        </header>
        <ReviewSession />
      </div>
    </main>
  );
}
