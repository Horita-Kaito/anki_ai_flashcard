"use client";

import { useCurrentUser, useLogout } from "@/features/auth";
import { useOnboardingStatus } from "@/features/onboarding";
import { DashboardOverview } from "@/features/dashboard";
import { Button } from "@/shared/ui/button";
import { PageShell } from "@/shared/ui/page-shell";
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
    <PageShell
      title="ダッシュボード"
      description={`${user.name} さん、おかえりなさい。今日の作成・復習・整理をここから始めます。`}
      action={
        <Button
          variant="outline"
          size="lg"
          onClick={handleLogout}
          disabled={logout.isPending}
          className="min-h-11"
        >
          ログアウト
        </Button>
      }
    >
      <DashboardOverview />
    </PageShell>
  );
}
