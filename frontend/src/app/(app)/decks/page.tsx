import Link from "next/link";
import type { Metadata } from "next";
import { DeckList } from "@/features/deck";
import { buttonVariants } from "@/shared/ui/button";

export const metadata: Metadata = {
  title: "デッキ一覧 | Anki AI Flashcard",
};

export default function DecksPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">デッキ</h1>
          <Link
            href="/decks/new"
            className={`${buttonVariants({ size: "sm" })} min-h-11`}
          >
            新規作成
          </Link>
        </div>
        <DeckList />
      </div>
    </main>
  );
}
