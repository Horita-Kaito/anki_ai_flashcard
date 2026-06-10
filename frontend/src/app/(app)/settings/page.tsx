import type { Metadata } from "next";
import { UserSettingForm } from "@/features/user-setting";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "設定 | まなメモAI",
};

export default function SettingsPage() {
  return (
    <PageShell
      title="設定"
      description="学習と AI 生成のデフォルト値を調整します。"
      maxWidth="2xl"
    >
      <UserSettingForm />
    </PageShell>
  );
}
