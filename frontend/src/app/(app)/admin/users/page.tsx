import type { Metadata } from "next";
import { AdminUsersPageClient } from "@/features/admin-user/components/admin-users-page-client";

export const metadata: Metadata = {
  title: "管理 | ユーザー作成",
};

export default function AdminUsersPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">ユーザー作成</h1>
          <p className="text-sm text-muted-foreground">
            管理者として新しいユーザーアカウントを発行できます。パスワードはランダム生成されます。
          </p>
        </header>
        <AdminUsersPageClient />
      </div>
    </main>
  );
}
