import {
  ArrowRight,
  Award,
  Briefcase,
  Calculator,
  Check,
  Code,
  Languages,
  Lightbulb,
  Loader2,
} from "lucide-react";

import { Button } from "@/shared/ui/button";

export const GOAL_OPTIONS = [
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

interface OnboardingGoalStepProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
  isPending: boolean;
  isError: boolean;
}

export function OnboardingGoalStep({
  selected,
  onToggle,
  onNext,
  isPending,
  isError,
}: OnboardingGoalStepProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          何を学んでいますか?
        </h1>
        <p className="text-sm text-muted-foreground">
          選択に応じて、AI の策問テンプレートとデッキを用意します(複数選択可)
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = selected.has(goal.id);
          const Icon = goal.icon;

          return (
            <button
              key={goal.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(goal.id)}
              className={`relative flex min-h-11 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "border-primary bg-[var(--forest-faint)]"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              {isSelected && (
                <span
                  aria-hidden
                  className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="size-3" />
                </span>
              )}
              <Icon
                aria-hidden
                className={`size-6 ${isSelected ? "text-[var(--forest)]" : "text-muted-foreground"}`}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium leading-tight">{goal.label}</span>
                <span className="block text-xs leading-snug text-muted-foreground">
                  {goal.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <Button
          size="touch"
          className="w-full"
          disabled={selected.size === 0 || isPending}
          onClick={onNext}
        >
          {isPending ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              セットアップ中...
            </>
          ) : (
            <>
              次へ
              <ArrowRight data-icon="inline-end" />
            </>
          )}
        </Button>

        {selected.size === 0 && !isPending && (
          <p className="text-center text-sm text-muted-foreground">
            学習目的を 1 つ以上選んでください
          </p>
        )}

        {isError && (
          <p role="alert" className="text-center text-sm text-destructive">
            セットアップに失敗しました。もう一度お試しください。
          </p>
        )}
      </div>
    </div>
  );
}
