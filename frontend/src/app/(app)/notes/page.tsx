import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { NoteSeedList } from "@/features/note-seed";
import { buttonVariants } from "@/shared/ui/button";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "メモ一覧 | Tessera",
};

export default function NotesPage() {
  return (
    <PageShell
      title="メモ"
      description="学習中の断片を残し、AI のカード候補レビューまでつなげます。"
      action={
        <Link
          href="/notes/new"
          className={`${buttonVariants({ size: "lg" })} min-h-11`}
        >
          <Plus className="size-4" aria-hidden />
          メモを書く
        </Link>
      }
    >
      <NoteSeedList />
    </PageShell>
  );
}
