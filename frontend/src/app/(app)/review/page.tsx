import type { Metadata } from "next";
import { ReviewSession } from "@/features/review";

export const metadata: Metadata = {
  title: "復習 | Tessera",
};

/**
 * 復習ページ。`?deck_id=N` でデッキ (子孫含む) にスコープを絞った集中復習ができる。
 * 未指定なら全デッキ横断で今日の due カードを出題する。
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ deck_id?: string }>;
}) {
  const params = await searchParams;
  const parsed = Number(params.deck_id);
  const deckId = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 md:px-6 md:py-4">
      <ReviewSession deckId={deckId} />
    </main>
  );
}
