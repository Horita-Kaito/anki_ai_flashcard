import type { Metadata } from "next";
import { DeckForm } from "@/features/deck";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "デッキ作成 | まとメモAI",
};

export default function NewDeckPage() {
  return (
    <PageShell
      title="デッキを作成"
      description="学習分野や試験範囲ごとに、カードの受け皿を作ります。"
      maxWidth="2xl"
    >
      <DeckForm />
    </PageShell>
  );
}
