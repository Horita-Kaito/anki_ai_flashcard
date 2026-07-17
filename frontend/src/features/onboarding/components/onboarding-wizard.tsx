"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { useSubmitOnboarding } from "../api/onboarding-queries";
import { OnboardingWelcomeStep } from "./onboarding-welcome-step";
import { OnboardingGoalStep } from "./onboarding-goal-step";
import { OnboardingFirstNoteStep } from "./onboarding-first-note-step";

const STEP_LABELS = ["ようこそ", "学習目的", "最初のメモ"] as const;

interface OnboardingWizardProps {
  userName?: string;
}

/**
 * 3 ステップのオンボーディング。
 * 1. プロダクトの仕組み (メモ → AI 候補 → 採用 → 復習) を伝える
 * 2. 学習目的を選んでもらい API に送信する
 * 3. 初回成功体験 (最初のメモ作成) へ誘導する
 */
export function OnboardingWizard({ userName }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const submitMutation = useSubmitOnboarding();

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

  async function handleGoalSubmit() {
    try {
      await submitMutation.mutateAsync([...selected]);
      setStep(2);
    } catch {
      // エラー表示は submitMutation.isError で行う
    }
  }

  return (
    <div className="w-full max-w-xl space-y-8">
      <nav aria-label="オンボーディングの進行状況" className="flex items-center gap-3">
        {step === 1 ? (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="前のステップへ戻る"
            onClick={() => setStep(0)}
          >
            <ChevronLeft />
          </Button>
        ) : (
          <span className="size-9" aria-hidden />
        )}
        <ol className="mx-auto flex items-center gap-2">
          {STEP_LABELS.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={index === step ? "step" : undefined}
                className={`flex items-center gap-1.5 text-xs ${
                  index === step
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${
                    index <= step ? "bg-primary" : "bg-border"
                  }`}
                />
                {label}
              </span>
            </li>
          ))}
        </ol>
        <span className="size-9" aria-hidden />
      </nav>

      {step === 0 && (
        <OnboardingWelcomeStep userName={userName} onNext={() => setStep(1)} />
      )}
      {step === 1 && (
        <OnboardingGoalStep
          selected={selected}
          onToggle={toggleGoal}
          onNext={handleGoalSubmit}
          isPending={submitMutation.isPending}
          isError={submitMutation.isError}
        />
      )}
      {step === 2 && (
        <OnboardingFirstNoteStep
          onWriteNote={() => router.push("/notes/new")}
          onSkip={() => router.push("/dashboard")}
        />
      )}
    </div>
  );
}
