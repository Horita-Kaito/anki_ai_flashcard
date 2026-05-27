import type { Metadata } from "next";
import { AdminUsersPageClient } from "@/features/admin-user/components/admin-users-page-client";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "管理 | ユーザー作成",
};

export default function AdminUsersPage() {
  return (
    <PageShell
      title="ユーザー作成"
      description="管理者として新しいユーザーアカウントを発行します。"
      maxWidth="2xl"
    >
      <AdminUsersPageClient />
    </PageShell>
  );
}
