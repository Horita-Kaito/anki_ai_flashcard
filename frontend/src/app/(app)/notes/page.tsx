import Link from "next/link";
import type { Metadata } from "next";
import { NoteSeedList } from "@/features/note-seed";
import { buttonVariants } from "@/shared/ui/button";

export const metadata: Metadata = {
  title: "メモ一覧 | Anki AI Flashcard",
};

export default function NotesPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">メモ</h1>
          <Link
            href="/notes/new"
            className={`${buttonVariants({ size: "sm" })} min-h-11 shrink-0`}
          >
            新規メモ
          </Link>
        </div>
        <NoteSeedList />
      </div>
    </main>
  );
}
