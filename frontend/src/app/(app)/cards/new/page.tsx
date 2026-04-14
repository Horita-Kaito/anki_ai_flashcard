import type { Metadata } from "next";
import { CardForm } from "@/features/card";

export const metadata: Metadata = {
  title: "カード作成 | Anki AI Flashcard",
};

export default function NewCardPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">カードを作成</h1>
          <p className="text-sm text-muted-foreground">
            手動でカードを作成します。AI 生成のカードはメモから作れます。
          </p>
        </header>
        <CardForm />
      </div>
    </main>
  );
}
