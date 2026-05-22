import type { Metadata } from "next";
import { AdminSystemSettingsPageClient } from "@/features/admin-system-setting";

export const metadata: Metadata = {
  title: "管理 | システム設定",
};

export default function AdminSystemSettingsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">システム設定</h1>
          <p className="text-sm text-muted-foreground">
            全ユーザー共通のシステム設定です。AI 利用上限などをここで調整します。
          </p>
        </header>
        <AdminSystemSettingsPageClient />
      </div>
    </main>
  );
}
