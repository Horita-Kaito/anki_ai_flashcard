import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  NotebookPen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/shared/ui/button";

const FLOW_STEPS = [
  {
    icon: NotebookPen,
    title: "メモを書く",
    description: "学習中に覚えたいこと・間違えたことを短く残す",
  },
  {
    icon: Sparkles,
    title: "AI が候補を作る",
    description: "メモから復習用のカード候補を自動生成",
  },
  {
    icon: CheckCircle2,
    title: "自分で選んで採用",
    description: "使える候補だけをカードにする",
  },
  {
    icon: GraduationCap,
    title: "忘れる前に復習",
    description: "間隔反復で、ちょうど忘れそうな日に出題",
  },
] as const;

interface OnboardingWelcomeStepProps {
  userName?: string;
  onNext: () => void;
}

export function OnboardingWelcomeStep({ userName, onNext }: OnboardingWelcomeStepProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium text-[var(--bronze)]">
          {userName ? `${userName} さん、ようこそ` : "ようこそ"}
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          メモが、明日の記憶になる
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Tessera は、学習メモから AI がフラッシュカード候補を作り、
          間隔反復で記憶に定着させる学習アプリです。使い方はこの 4 ステップだけ。
        </p>
      </header>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FLOW_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-xl border bg-card p-4"
            >
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--forest-faint)] text-[var(--forest)]"
              >
                <Icon className="size-4.5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  <span className="mr-1 text-xs text-muted-foreground">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="flex items-start justify-center gap-2 rounded-lg bg-[var(--bronze-faint)] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--bronze)]" />
        AI が作った候補は、自動ではカードになりません。採用するかどうかを決めるのはあなたです。
      </p>

      <Button size="touch" className="w-full" onClick={onNext}>
        はじめる
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}
