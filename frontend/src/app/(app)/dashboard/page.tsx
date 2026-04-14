"use client";

import { useCurrentUser, useLogout } from "@/features/auth";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();
  const logout = useLogout();

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </main>
    );
  }

  if (isError || !user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <p>認証されていません</p>
        <Button
          onClick={() => router.push("/login")}
          size="lg"
          className="min-h-11"
        >
          ログインへ
        </Button>
      </main>
    );
  }

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/");
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">ダッシュボード</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="min-h-11"
          >
            ログアウト
          </Button>
        </div>

        <div className="border rounded-xl p-4 md:p-6 space-y-2">
          <p className="text-sm text-muted-foreground">ようこそ</p>
          <p className="text-lg md:text-xl font-semibold">{user.name} さん</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div className="border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">今日の復習</p>
            <p className="text-2xl font-bold mt-1">--</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">新規候補</p>
            <p className="text-2xl font-bold mt-1">--</p>
          </div>
          <div className="border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">総カード数</p>
            <p className="text-2xl font-bold mt-1">--</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Phase 1 以降で機能を追加していきます。
        </p>
      </div>
    </main>
  );
}
