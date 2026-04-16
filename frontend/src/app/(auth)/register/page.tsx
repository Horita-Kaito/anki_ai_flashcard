import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "新規登録",
  description:
    "無料アカウントを作成して、AI が生成するフラッシュカードで効率的に学習を始めましょう。",
};

export default function RegisterPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-sm space-y-6 border rounded-xl p-6 md:p-8 bg-background">
        <header className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">新規登録</h1>
          <p className="text-sm text-muted-foreground">
            学習データはあなた専用に分離されます
          </p>
        </header>

        <RegisterForm />

        <p className="text-sm text-center text-muted-foreground">
          すでにアカウントがある方は{" "}
          <Link href="/login" className="underline underline-offset-2">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
