"use client";

import Link from "next/link";
import { GraduationCap, NotebookPen, Layers } from "lucide-react";
import { useDashboardSummary } from "../api/dashboard-queries";

function StatCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number | string;
  href?: string;
  icon: React.ReactNode;
}) {
  const content = (
    <div className="border rounded-xl p-4 bg-card flex items-start gap-3 min-h-24 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export function DashboardOverview() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 border rounded-xl bg-muted/30 animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p role="alert" className="text-sm text-destructive">
        ダッシュボードの読み込みに失敗しました
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatCard
          label="今日の復習"
          value={data.due_count_today}
          href="/review"
          icon={<GraduationCap className="size-5" />}
        />
        <StatCard
          label="新規カード"
          value={data.new_cards_count}
          href="/cards"
          icon={<Layers className="size-5" />}
        />
        <StatCard
          label="総カード数"
          value={data.total_cards}
          href="/cards"
          icon={<Layers className="size-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <section aria-labelledby="recent-notes" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="recent-notes"
              className="font-semibold flex items-center gap-2"
            >
              <NotebookPen className="size-4" aria-hidden />
              最近のメモ
            </h2>
            <Link
              href="/notes"
              className="text-xs text-muted-foreground underline underline-offset-2 min-h-11 flex items-center"
            >
              すべて見る
            </Link>
          </div>
          {data.recent_notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだメモがありません</p>
          ) : (
            <ul className="space-y-2">
              {data.recent_notes.map((n) => (
                <li key={n.id}>
                  <Link
                    href={`/notes/${n.id}`}
                    className="block border rounded-lg p-3 min-h-14 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  >
                    <p className="text-sm line-clamp-2">{n.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recent-cards" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="recent-cards"
              className="font-semibold flex items-center gap-2"
            >
              <Layers className="size-4" aria-hidden />
              最近のカード
            </h2>
            <Link
              href="/cards"
              className="text-xs text-muted-foreground underline underline-offset-2 min-h-11 flex items-center"
            >
              すべて見る
            </Link>
          </div>
          {data.recent_cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだカードがありません</p>
          ) : (
            <ul className="space-y-2">
              {data.recent_cards.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cards/${c.id}`}
                    className="block border rounded-lg p-3 min-h-14 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  >
                    <p className="text-sm line-clamp-2">{c.question}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
