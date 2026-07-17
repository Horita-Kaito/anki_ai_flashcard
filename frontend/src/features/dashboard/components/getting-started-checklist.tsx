"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, ChevronRight, X } from "lucide-react";

import type { DashboardSummary } from "@/entities/dashboard/types";
import { Button } from "@/shared/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";

const DISMISS_KEY = "tessera.gettingStarted.dismissed";

interface ChecklistStep {
  key: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

function buildSteps(summary: DashboardSummary): ChecklistStep[] {
  const hasNote = summary.recent_notes.length > 0;
  const hasCard = summary.total_cards > 0;
  return [
    {
      key: "note",
      label: "最初のメモを書く",
      description: "覚えたいことを 1 つ書くと、AI がカード候補を作ります",
      href: "/notes/new",
      done: hasNote,
    },
    {
      key: "adopt",
      label: "AI 候補を採用してカードにする",
      description: "候補を確認して、使えるものだけ採用します",
      href: hasNote ? "/notes" : "/notes/new",
      done: hasCard,
    },
    {
      key: "review",
      label: "今日の復習をする",
      description: "採用したカードが復習に出ます。思い出して自己評価",
      href: "/review",
      done: summary.streak.today_done,
    },
  ];
}

interface GettingStartedChecklistProps {
  summary: DashboardSummary;
}

/**
 * 新規ユーザー向け「はじめの 3 ステップ」。
 * メモ → 採用 → 復習 の中心ループを最初に一周してもらうためのガイド。
 * 全ステップ完了で自動的に消え、× で手動で閉じることもできる。
 */
export function GettingStartedChecklist({ summary }: GettingStartedChecklistProps) {
  // SSR 中は非表示 (server snapshot=true) にし、ハイドレーション後に localStorage を反映する
  const storedDismissed = useSyncExternalStore(
    () => () => {},
    () => window.localStorage.getItem(DISMISS_KEY) === "1",
    () => true
  );
  const [dismissedNow, setDismissedNow] = useState(false);

  const steps = buildSteps(summary);
  const allDone = steps.every((s) => s.done);
  if (storedDismissed || dismissedNow || allDone) return null;

  const nextIndex = steps.findIndex((s) => !s.done);

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissedNow(true);
  }

  return (
    <Card className="border-[color-mix(in_oklch,var(--forest),transparent_70%)] bg-[var(--forest-faint)]/60">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>はじめの 3 ステップ</CardTitle>
          <CardDescription>
            この 1 周で、Tessera の使い方が全部わかります
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="ガイドを閉じる"
          onClick={handleDismiss}
        >
          <X />
        </Button>
      </CardHeader>
      <ol className="space-y-1 p-4 pt-0 md:p-5 md:pt-0">
        {steps.map((step, index) => {
          const isNext = index === nextIndex;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                aria-disabled={step.done}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  step.done
                    ? "pointer-events-none opacity-60"
                    : isNext
                      ? "bg-card shadow-xs hover:bg-card/80"
                      : "hover:bg-card/60"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    step.done
                      ? "border-transparent bg-primary text-primary-foreground"
                      : isNext
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {step.done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm font-medium ${step.done ? "line-through" : ""}`}
                  >
                    {step.label}
                  </span>
                  {!step.done && (
                    <span className="block text-xs leading-snug text-muted-foreground">
                      {step.description}
                    </span>
                  )}
                </span>
                {!step.done && (
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
