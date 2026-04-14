import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export function DeckListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-dashed rounded-xl p-8 text-center">
      <div className="space-y-1">
        <p className="font-medium">まだデッキがありません</p>
        <p className="text-sm text-muted-foreground">
          学習する分野ごとにデッキを作成できます
        </p>
      </div>
      <Link
        href="/decks/new"
        className={`${buttonVariants({ size: "lg" })} min-h-11`}
      >
        最初のデッキを作成
      </Link>
    </div>
  );
}
