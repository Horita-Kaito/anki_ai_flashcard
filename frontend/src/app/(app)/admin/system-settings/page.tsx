import type { Metadata } from "next";
import { AdminSystemSettingsPageClient } from "@/features/admin-system-setting";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "管理 | システム設定",
};

export default function AdminSystemSettingsPage() {
  return (
    <PageShell
      title="システム設定"
      description="全ユーザー共通の AI 利用上限と運用設定を調整します。"
      maxWidth="2xl"
    >
      <AdminSystemSettingsPageClient />
    </PageShell>
  );
}
