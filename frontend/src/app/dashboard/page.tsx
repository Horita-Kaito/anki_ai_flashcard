"use client";

import { Button } from "@/components/ui/button";
import { logout, me } from "@/lib/api/auth";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: me,
    retry: false,
  });

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </main>
    );
  }

  if (isError || !user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <p>認証されていません</p>
        <Button onClick={() => router.push("/login")}>ログインへ</Button>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
          <Button variant="outline" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>

        <div className="border rounded-lg p-6 space-y-2">
          <p className="text-sm text-muted-foreground">ようこそ</p>
          <p className="text-xl font-semibold">{user.name} さん</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">今日の復習</p>
            <p className="text-2xl font-bold">--</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">新規候補</p>
            <p className="text-2xl font-bold">--</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">総カード数</p>
            <p className="text-2xl font-bold">--</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Phase 1 以降で機能を追加していきます。
        </p>
      </div>
    </main>
  );
}
