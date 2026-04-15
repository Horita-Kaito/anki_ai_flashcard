import type { Metadata } from "next";
import { StatsOverview } from "@/features/review";

export const metadata: Metadata = {
  title: "学習統計 | Anki AI Flashcard",
};

export default function StatsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold">学習統計</h1>
          <p className="text-sm text-muted-foreground mt-1">
            復習の進捗とデッキ別のパフォーマンスを確認できます
          </p>
        </header>
        <StatsOverview />
      </div>
    </main>
  );
}
