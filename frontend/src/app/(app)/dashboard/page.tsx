"use client";

import { useCurrentUser, useLogout } from "@/features/auth";
import { DashboardOverview } from "@/features/dashboard";
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">ダッシュボード</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} さん、おかえりなさい
            </p>
          </div>
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

        <DashboardOverview />
      </div>
    </main>
  );
}
