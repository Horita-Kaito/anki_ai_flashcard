import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "ログイン",
  description: "Anki AI Flashcard にログインして、フラッシュカード学習を続けましょう。",
};

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-sm space-y-6 border rounded-xl p-6 md:p-8 bg-background">
        <header className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">ログイン</h1>
          <p className="text-sm text-muted-foreground">
            メールアドレスとパスワードを入力してください
          </p>
        </header>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="text-sm text-center text-muted-foreground">
          アカウント未作成の方は{" "}
          <Link href="/register" className="underline underline-offset-2">
            新規登録
          </Link>
        </p>
      </div>
    </main>
  );
}
