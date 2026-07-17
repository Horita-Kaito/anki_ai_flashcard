"use client";

import Link from "next/link";
import {
  ChevronRight,
  GraduationCap,
  Layers,
  MessageCircleMore,
  NotebookPen,
  Plus,
  Sparkles,
} from "lucide-react";

import { ErrorState } from "@/shared/ui/error-state";
import { useDashboardSummary } from "../api/dashboard-queries";
import { DashboardLearningCharts } from "./dashboard-learning-charts";
import { GettingStartedChecklist } from "./getting-started-checklist";
import { StreakRing } from "./streak-ring";

/** 今日の復習ヒーロー。この画面で最初に目に入る「今日やること」 */
function ReviewHero({ due, todayDone }: { due: number; todayDone: boolean }) {
  if (due > 0) {
    return (
      <div className="flex flex-col justify-between gap-4 rounded-xl bg-primary p-5 text-primary-foreground md:p-6">
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary-foreground/85">
            <GraduationCap aria-hidden className="size-4" />
            今日の復習
          </p>
          <p className="font-serif text-4xl font-semibold leading-tight md:text-5xl">
            {due} <span className="text-xl font-medium md:text-2xl">枚</span>
          </p>
          <p className="text-sm text-primary-foreground/85">
            忘れる前に、思い出しましょう
          </p>
        </div>
        <Link
          href="/review"
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg bg-primary-foreground px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
        >
          復習を始める
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border bg-[var(--forest-faint)] p-5 md:p-6">
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--forest)]">
          <GraduationCap aria-hidden className="size-4" />
          今日の復習
        </p>
        <p className="font-serif text-2xl font-semibold leading-tight">
          {todayDone ? "今日の分は完了です" : "今日の予定はありません"}
        </p>
        <p className="text-sm text-muted-foreground">
          {todayDone
            ? "おつかれさまでした。メモを書けば明日のカードが増えます"
            : "カードを採用すると、翌日から復習に出るようになります"}
        </p>
      </div>
      <Link
        href="/notes/new"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg border bg-card px-5 text-sm font-semibold transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        メモを書く
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

/** 未レビュー AI 候補の承認待ちコールアウト。0 件のときは表示しない */
function PendingCandidatesCallout({ count }: { count: number }) {
  return (
    <Link
      href="/notes"
      className="flex items-center gap-3 rounded-xl border border-[color-mix(in_oklch,var(--persimmon),transparent_60%)] bg-[var(--persimmon-faint)] p-4 transition-colors hover:bg-[var(--persimmon-soft)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--persimmon-soft)]/60 text-[var(--persimmon)]"
      >
        <Sparkles className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">
          AI 候補が {count} 件、承認待ちです
        </span>
        <span className="block text-xs text-muted-foreground">
          採用したカードだけが復習に出ます。確認して選びましょう
        </span>
      </span>
      <span className="flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-medium text-[var(--persimmon)]">
        レビューする
        <ChevronRight aria-hidden className="size-4" />
      </span>
    </Link>
  );
}

function QuickAction({
  href,
  label,
  sublabel,
  icon,
}: {
  href: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-11 items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bronze-faint)] text-[var(--bronze)] [&_svg]:size-4.5"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted-foreground">{sublabel}</span>
      </span>
    </Link>
  );
}

export function DashboardOverview() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr] md:gap-4">
          <div className="h-44 rounded-xl shimmer" aria-hidden />
          <div className="h-44 rounded-xl shimmer" aria-hidden />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" aria-hidden />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const dueToday = data.due_count_today;
  // API が全メモ横断の未レビュー候補総数を返す場合はそれを優先。
  // 無い場合は recent_notes の集計にフォールバックする (旧 API 互換)。
  const pendingReview =
    data.total_pending_candidates ??
    data.recent_notes.reduce(
      (sum, note) =>
        sum +
        ((note as { candidates_pending_count?: number }).candidates_pending_count ??
          0),
      0
    );
  const monthCostJpyApprox = Math.round(data.ai_usage.month_cost_usd * 150);

  return (
    <div className="space-y-5 md:space-y-6">
      <GettingStartedChecklist summary={data} />

      <section aria-labelledby="today-heading" className="space-y-3 md:space-y-4">
        <h2 id="today-heading" className="sr-only">
          今日やること
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr] md:gap-4">
          <ReviewHero due={dueToday} todayDone={data.streak.today_done} />
          <div className="rounded-xl border bg-card p-4">
            <StreakRing streak={data.streak} />
          </div>
        </div>
        {pendingReview > 0 && <PendingCandidatesCallout count={pendingReview} />}
      </section>

      <section aria-labelledby="quick-actions" className="space-y-3">
        <h2 id="quick-actions" className="sr-only">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            href="/notes/new"
            label="メモを書く"
            sublabel="AI がカード候補を作ります"
            icon={<Plus />}
          />
          <QuickAction
            href="/chat"
            label="チャットで学ぶ"
            sublabel="会話からメモとカードを作る"
            icon={<MessageCircleMore />}
          />
          <QuickAction
            href="/cards"
            label="カードを探す"
            sublabel="検索・整理・アーカイブ"
            icon={<Layers />}
          />
        </div>
      </section>

      <DashboardLearningCharts summary={data} pendingReview={pendingReview} />

      {/* 補助統計 (主役にしない: 折りたたみの要約表示) */}
      <details className="group rounded-xl bg-[var(--bronze-faint)]/70 px-4 py-1 md:px-5">
        <summary className="flex min-h-11 cursor-pointer list-none select-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <span aria-hidden className="transition-transform group-open:rotate-90">
            ▸
          </span>
          <Sparkles className="size-3.5" aria-hidden />
          AI 使用量と総量
        </summary>
        <dl className="grid grid-cols-2 gap-3 pb-4 pt-1 sm:grid-cols-4 md:gap-4">
          <div>
            <dt className="text-xs text-muted-foreground">総カード数</dt>
            <dd className="mt-0.5 text-lg font-semibold">{data.total_cards}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">新規カード</dt>
            <dd className="mt-0.5 text-lg font-semibold">{data.new_cards_count}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">今月 AI 呼出</dt>
            <dd className="mt-0.5 text-lg font-semibold">{data.ai_usage.month_calls}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">今月コスト</dt>
            <dd className="mt-0.5 text-lg font-semibold">
              ${data.ai_usage.month_cost_usd.toFixed(4)}
            </dd>
            <dd className="text-[10px] text-muted-foreground">
              約 ¥{monthCostJpyApprox}
            </dd>
          </div>
        </dl>
      </details>

      {/* 最近の更新 (補助情報、最下段) */}
      {(data.recent_notes.length > 0 || data.recent_cards.length > 0) && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none select-none items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <span aria-hidden className="transition-transform group-open:rotate-90">
              ▸
            </span>
            最近の更新を表示
          </summary>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <section aria-labelledby="recent-notes" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3
                  id="recent-notes"
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
                >
                  <NotebookPen className="size-3.5" aria-hidden />
                  最近のメモ
                </h3>
                <Link
                  href="/notes"
                  className="flex min-h-11 items-center text-xs underline underline-offset-2"
                >
                  すべて見る
                </Link>
              </div>
              <ul className="space-y-1.5">
                {data.recent_notes.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/notes/${n.id}`}
                      className="line-clamp-2 block min-h-11 rounded-md px-3 py-2 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {n.body}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="recent-cards" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3
                  id="recent-cards"
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
                >
                  <Layers className="size-3.5" aria-hidden />
                  最近のカード
                </h3>
                <Link
                  href="/cards"
                  className="flex min-h-11 items-center text-xs underline underline-offset-2"
                >
                  すべて見る
                </Link>
              </div>
              <ul className="space-y-1.5">
                {data.recent_cards.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/cards/${c.id}`}
                      className="line-clamp-2 block min-h-11 rounded-md px-3 py-2 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {c.question}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </details>
      )}
    </div>
  );
}
