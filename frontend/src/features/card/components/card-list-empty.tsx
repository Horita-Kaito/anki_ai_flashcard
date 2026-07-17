import Link from "next/link";
import { CreditCard, Plus, StickyNote } from "lucide-react";

import { buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

export function CardListEmpty() {
  return (
    <EmptyState
      icon={<CreditCard aria-hidden />}
      title="まだカードがありません"
      description="おすすめはメモから。書いたメモを AI がカード候補にしてくれます。もちろん手動でも作れます。"
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/notes/new" className={buttonVariants({ size: "touch" })}>
            <StickyNote aria-hidden />
            メモから始める
          </Link>
          <Link
            href="/cards/new"
            className={buttonVariants({ variant: "outline", size: "touch" })}
          >
            <Plus aria-hidden />
            手動でカードを作る
          </Link>
        </div>
      }
    />
  );
}
