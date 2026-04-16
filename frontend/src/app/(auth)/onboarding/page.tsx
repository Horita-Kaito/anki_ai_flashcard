"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Code,
  Languages,
  Award,
  Calculator,
  Briefcase,
  Lightbulb,
  Check,
  Loader2,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth";
import { useOnboardingStatus, useSubmitOnboarding } from "@/features/onboarding";
import { Button } from "@/shared/ui/button";

const GOALS = [
  {
    id: "programming",
    icon: Code,
    label: "プログラミング・IT",
    description: "コード、アルゴリズム、設計パターン",
  },
  {
    id: "language",
    icon: Languages,
    label: "英語・語学",
    description: "単語、文法、リスニング",
  },
  {
    id: "exam",
    icon: Award,
    label: "資格試験",
    description: "試験対策、頻出問題",
  },
  {
    id: "math_science",
    icon: Calculator,
    label: "数学・理系",
    description: "公式、定理、証明",
  },
  {
    id: "business",
    icon: Briefcase,
    label: "ビジネス・経営",
    description: "用語、フレームワーク、戦略",
  },
  {
    id: "other",
    icon: Lightbulb,
    label: "その他",
    description: "自由な学習テーマ",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: user, isLoading: authLoading, isError: authError } = useCurrentUser();
  // 認証が確認できるまでオンボーディングステータスの取得を遅延させる
  const isAuthenticated = !!user && !authLoading && !authError;
  const { data: onboardingStatus, isLoading: statusLoading } =
    useOnboardingStatus(isAuthenticated);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const submitMutation = useSubmitOnboarding();

  if (authLoading || (isAuthenticated && statusLoading)) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  useEffect(() => {
    if (!authLoading && (authError || !user)) {
      router.push("/login");
    }
  }, [authLoading, authError, user, router]);

  useEffect(() => {
    if (onboardingStatus?.completed) {
      router.push("/dashboard");
    }
  }, [onboardingStatus, router]);

  if (!user || onboardingStatus?.completed) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  function toggleGoal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit() {
    try {
      await submitMutation.mutateAsync([...selected]);
      router.push("/dashboard");
    } catch {
      // error state is handled by submitMutation.isError
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            学習目的を教えてください
          </h1>
          <p className="text-sm text-muted-foreground">
            選択に応じて、最適なテンプレートとデッキを用意します（複数選択可）
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {GOALS.map((goal) => {
            const isSelected = selected.has(goal.id);
            const Icon = goal.icon;

            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={`relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all min-h-[44px] ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </div>
                )}
                <Icon className="size-6 text-foreground/70" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-tight">
                    {goal.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {goal.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          size="lg"
          className="w-full min-h-11"
          disabled={selected.size === 0 || submitMutation.isPending}
          onClick={handleSubmit}
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              セットアップ中...
            </>
          ) : (
            "セットアップを開始"
          )}
        </Button>

        {submitMutation.isError && (
          <p role="alert" className="text-sm text-center text-red-600">
            セットアップに失敗しました。もう一度お試しください。
          </p>
        )}
      </div>
    </main>
  );
}
