import Link from "next/link";
import { CreditCard, Plus, StickyNote } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";

export function CardListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-dashed rounded-xl p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <CreditCard className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">まだカードがありません</p>
        <p className="text-sm text-muted-foreground">
          手動でカードを作るか、メモから AI 生成しましょう
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Link
          href="/cards/new"
          className={`${buttonVariants({ size: "lg" })} min-h-11`}
        >
          <Plus className="size-4" aria-hidden />
          カードを作る
        </Link>
        <Link
          href="/notes/new"
          className={`${buttonVariants({ variant: "outline", size: "lg" })} min-h-11`}
        >
          <StickyNote className="size-4" aria-hidden />
          メモから始める
        </Link>
      </div>
    </div>
  );
}
