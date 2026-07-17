"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useCurrentUser } from "@/features/auth";
import { OnboardingWizard, useOnboardingStatus } from "@/features/onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: user, isLoading: authLoading, isError: authError } = useCurrentUser();
  const isAuthenticated = !!user && !authLoading && !authError;
  const { data: onboardingStatus, isLoading: statusLoading } =
    useOnboardingStatus(isAuthenticated);
  const redirected = useRef(false);
  // ウィザード途中 (目的送信後) の completed 更新でリダイレクトしないよう、
  // 初回ロード時点の完了状態だけを判定に使う
  const [initialCompleted, setInitialCompleted] = useState<boolean | null>(null);
  if (onboardingStatus && initialCompleted === null) {
    setInitialCompleted(onboardingStatus.completed);
  }

  useEffect(() => {
    if (redirected.current) return;
    if (!authLoading && (authError || !user)) {
      redirected.current = true;
      router.push("/login");
    }
  }, [authLoading, authError, user, router]);

  useEffect(() => {
    if (redirected.current) return;
    if (initialCompleted) {
      redirected.current = true;
      router.push("/dashboard");
    }
  }, [initialCompleted, router]);

  if (
    authLoading ||
    (isAuthenticated && statusLoading) ||
    !user ||
    initialCompleted !== false
  ) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-background p-4 py-10 text-foreground md:p-8">
      <OnboardingWizard userName={user.name} />
    </main>
  );
}
