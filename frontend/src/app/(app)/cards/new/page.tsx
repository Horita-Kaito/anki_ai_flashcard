import type { Metadata } from "next";
import { CardForm } from "@/features/card";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "カード作成 | まなメモAI",
};

export default function NewCardPage() {
  return (
    <PageShell
      title="カードを作成"
      description="AI を使わずに、すぐ復習へ回したいカードを手動で作ります。"
      maxWidth="2xl"
    >
      <CardForm />
    </PageShell>
  );
}
