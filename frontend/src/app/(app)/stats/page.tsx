import type { Metadata } from "next";
import { StatsOverview } from "@/features/review";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "学習統計 | まとメモAI",
};

export default function StatsPage() {
  return (
    <PageShell
      title="学習統計"
      description="復習の進捗とデッキ別の状態を確認します。"
      maxWidth="4xl"
    >
      <StatsOverview />
    </PageShell>
  );
}
