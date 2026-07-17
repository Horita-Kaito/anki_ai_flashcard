import Link from "next/link";
import { NotebookPen, Plus } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";

export function NoteSeedListEmpty() {
  return (
    <EmptyState
      icon={<NotebookPen aria-hidden />}
      title="最初のメモを書いてみましょう"
      description="学習中に気づいた断片を短く残すと、AI がカード候補を作ります。まずは 1 つだけで大丈夫です。"
      action={
        <Link
          href="/notes/new"
          className={buttonVariants({ size: "touch" })}
        >
          <Plus data-icon="inline-start" />
          最初のメモを書く
        </Link>
      }
    />
  );
}
