import type { Metadata } from "next";
import { NewNotePageClient } from "./new-note-page-client";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "メモを書く | Tessera",
};

export default function NewNotePage() {
  return (
    <PageShell
      title="メモを書く"
      description="授業・読書・調査中の断片を残し、そのままカード候補に変換します。"
      maxWidth="4xl"
    >
      <NewNotePageClient />
    </PageShell>
  );
}
