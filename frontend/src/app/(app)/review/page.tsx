import type { Metadata } from "next";
import { ReviewSession } from "@/features/review";

export const metadata: Metadata = {
  title: "復習 | Tessera",
};

export default function ReviewPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2 md:h-full md:px-6 md:py-4">
      <ReviewSession />
    </main>
  );
}
