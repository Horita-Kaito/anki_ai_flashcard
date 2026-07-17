import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

export function DeckListEmpty() {
  return (
    <EmptyState
      icon={<Layers aria-hidden />}
      title="まだデッキがありません"
      description="デッキは学習分野ごとのカードの入れ物です。「簿記 2 級」「ネットワーク」のように作ってみましょう。"
      action={
        <Link href="/decks/new" className={buttonVariants({ size: "touch" })}>
          <Plus aria-hidden />
          最初のデッキを作成
        </Link>
      }
    />
  );
}
