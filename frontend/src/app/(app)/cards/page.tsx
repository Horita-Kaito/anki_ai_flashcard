import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { CardList } from "@/features/card";
import { buttonVariants } from "@/shared/ui/button";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "カード一覧 | Anki AI Flashcard",
};

export default function CardsPage() {
  return (
    <PageShell
      title="カード"
      description="採用済みカードを確認し、復習に出す内容を整えます。"
      action={
        <Link
          href="/cards/new"
          className={`${buttonVariants({ size: "lg" })} min-h-11`}
        >
          <Plus className="size-4" aria-hidden />
          手動で作成
        </Link>
      }
    >
      <CardList />
    </PageShell>
  );
}
