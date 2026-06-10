import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { DeckList } from "@/features/deck";
import { buttonVariants } from "@/shared/ui/button";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "デッキ一覧 | Tessera",
};

export default function DecksPage() {
  return (
    <PageShell
      title="デッキ"
      description="学習分野ごとにカードをまとめ、復習のまとまりを管理します。"
      action={
        <Link
          href="/decks/new"
          className={`${buttonVariants({ size: "lg" })} min-h-11`}
        >
          <Plus className="size-4" aria-hidden />
          デッキ作成
        </Link>
      }
    >
      <DeckList />
    </PageShell>
  );
}
