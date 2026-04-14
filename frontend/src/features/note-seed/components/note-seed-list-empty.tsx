import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export function NoteSeedListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-dashed rounded-xl p-8 text-center">
      <div className="space-y-1">
        <p className="font-medium">まだメモがありません</p>
        <p className="text-sm text-muted-foreground">
          学習中に気になった断片を短いメモとして残しましょう。
          <br />
          AI があとでカード候補に変換します。
        </p>
      </div>
      <Link
        href="/notes/new"
        className={`${buttonVariants({ size: "lg" })} min-h-11`}
      >
        最初のメモを書く
      </Link>
    </div>
  );
}
