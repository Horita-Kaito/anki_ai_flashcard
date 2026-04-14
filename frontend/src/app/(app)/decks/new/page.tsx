import type { Metadata } from "next";
import { DeckForm } from "@/features/deck";

export const metadata: Metadata = {
  title: "デッキ作成 | Anki AI Flashcard",
};

export default function NewDeckPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">デッキを作成</h1>
          <p className="text-sm text-muted-foreground">
            学習する分野ごとにデッキを分けて管理できます
          </p>
        </header>
        <DeckForm />
      </div>
    </main>
  );
}
