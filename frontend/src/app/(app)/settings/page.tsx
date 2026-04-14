import type { Metadata } from "next";
import { UserSettingForm } from "@/features/user-setting";

export const metadata: Metadata = {
  title: "設定 | Anki AI Flashcard",
};

export default function SettingsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">設定</h1>
          <p className="text-sm text-muted-foreground">
            学習と AI 生成のデフォルト値を調整できます
          </p>
        </header>

        <UserSettingForm />
      </div>
    </main>
  );
}
