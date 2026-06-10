import type { Metadata } from "next";
import { UserSettingForm } from "@/features/user-setting";
import { TokenCreateForm, TokenList } from "@/features/api-token";
import { PageShell } from "@/shared/ui/page-shell";

export const metadata: Metadata = {
  title: "設定 | Tessera",
};

export default function SettingsPage() {
  return (
    <PageShell
      title="設定"
      description="学習と AI 生成のデフォルト値を調整します。"
      maxWidth="2xl"
    >
      <UserSettingForm />

      <section className="mt-10 space-y-4" aria-labelledby="api-tokens-heading">
        <div>
          <h2 id="api-tokens-heading" className="text-lg font-semibold">
            API トークン
          </h2>
          <p className="text-sm text-muted-foreground">
            Claude などの MCP クライアントや CLI から Tessera
            に接続するためのトークンを管理します。
          </p>
        </div>
        <TokenCreateForm />
        <TokenList />
      </section>
    </PageShell>
  );
}
