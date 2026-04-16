"use client";

import { useCurrentUser, useLogout } from "@/features/auth";
import { useOnboardingStatus } from "@/features/onboarding";
import { DashboardOverview } from "@/features/dashboard";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();
  const isAuthenticated = !!user && !isLoading && !isError;
  const { data: onboardingStatus, isLoading: statusLoading } =
    useOnboardingStatus(isAuthenticated);
  const logout = useLogout();

  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    if (onboardingStatus && !onboardingStatus.completed) {
      redirected.current = true;
      router.push("/onboarding");
    }
  }, [onboardingStatus, router]);

  if (isLoading || (isAuthenticated && statusLoading)) {
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

  // オンボーディング未完了の場合はリダイレクト中 (useEffect) なので何も表示しない
  if (onboardingStatus && !onboardingStatus.completed) {
    return null;
  }

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      // ログアウト失敗でもクライアント側のセッションは破棄済み
    }
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
