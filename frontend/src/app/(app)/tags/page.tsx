import type { Metadata } from "next";
import { TagManager } from "@/features/tag";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "タグ管理 | Tessera",
};

export default function TagsPage() {
  return (
    <PageShell
      title="タグ"
      description="カード横断の分類を管理します。"
      maxWidth="2xl"
    >
      <TagManager />
    </PageShell>
  );
}
