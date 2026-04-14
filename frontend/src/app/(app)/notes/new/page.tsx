import type { Metadata } from "next";
import { NoteSeedForm } from "@/features/note-seed";

export const metadata: Metadata = {
  title: "メモを書く | Anki AI Flashcard",
};

export default function NewNotePage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">メモを書く</h1>
          <p className="text-sm text-muted-foreground">
            短い断片でOK。あとで AI がカード候補に変換します。
          </p>
        </header>
        <NoteSeedForm />
      </div>
    </main>
  );
}
