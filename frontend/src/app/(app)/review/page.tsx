import type { Metadata } from "next";
import { ReviewSession } from "@/features/review";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "復習 | まなメモAI",
};

export default function ReviewPage() {
  return (
    <PageShell
      title="復習"
      description="今日出題されるカードを1枚ずつ確認します。"
      maxWidth="2xl"
      className="pb-28 md:pb-8"
    >
      <ReviewSession />
    </PageShell>
  );
}
