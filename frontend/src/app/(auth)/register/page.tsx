"use client";

import { Button } from "@/components/ui/button";
import { register } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirm,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "登録に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border rounded-lg p-6"
      >
        <h1 className="text-2xl font-bold">新規登録</h1>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            名前
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            パスワード (8文字以上)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password_confirmation" className="text-sm font-medium">
            パスワード (確認)
          </label>
          <input
            id="password_confirmation"
            type="password"
            required
            minLength={8}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "登録中..." : "登録"}
        </Button>

        <p className="text-sm text-center text-muted-foreground">
          すでにアカウントがある方は{" "}
          <Link href="/login" className="underline">
            ログイン
          </Link>
        </p>
      </form>
    </main>
  );
}
