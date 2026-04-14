import Link from "next/link";
import type { Metadata } from "next";
import { CardList } from "@/features/card";
import { buttonVariants } from "@/shared/ui/button";

export const metadata: Metadata = {
  title: "カード一覧 | Anki AI Flashcard",
};

export default function CardsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">カード</h1>
          <Link
            href="/cards/new"
            className={`${buttonVariants({ size: "sm" })} min-h-11 shrink-0`}
          >
            新規作成
          </Link>
        </div>
        <CardList />
      </div>
    </main>
  );
}
