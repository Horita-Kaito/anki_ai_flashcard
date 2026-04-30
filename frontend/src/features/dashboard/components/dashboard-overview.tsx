"use client";

import Link from "next/link";
import {
  GraduationCap,
  Layers,
  NotebookPen,
  Plus,
  Sparkles,
} from "lucide-react";
import { useDashboardSummary } from "../api/dashboard-queries";
import { StreakRing } from "./streak-ring";

/**
 * 入口 CTA カード。最も目立つ位置に置き、メモ作成・復習・デッキへの導線を最短にする。
 */
function EntryCta({
  href,
  label,
  sublabel,
  icon,
  variant = "primary",
}: {
  href: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base =
    "group flex flex-col items-start gap-2 rounded-xl p-5 md:p-6 min-h-28 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const tone =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
      : "bg-card border hover:bg-muted/50";
  const iconTone =
    variant === "primary"
      ? "bg-primary-foreground/15 text-primary-foreground"
      : "bg-primary/10 text-primary";

  return (
    <Link href={href} className={`${base} ${tone}`}>
      <span
        aria-hidden
        className={`flex size-10 items-center justify-center rounded-lg ${iconTone}`}
      >
        {icon}
      </span>
      <span className="text-base font-semibold leading-tight">{label}</span>
      {sublabel && (
        <span
          className={`text-xs leading-tight ${
            variant === "primary"
              ? "text-primary-foreground/85"
              : "text-muted-foreground"
          }`}
        >
          {sublabel}
        </span>
      )}
    </Link>
  );
}

export function DashboardOverview() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-muted/30 animate-pulse"
              aria-hidden
            />
          ))}
        </div>
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

  const dueToday = data.due_count_today;
  const monthCostJpyApprox = Math.round(data.ai_usage.month_cost_usd * 150);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 主要 CTA: 一気に作る・復習する・デッキを開く */}
      <section aria-labelledby="primary-actions" className="space-y-3">
        <h2 id="primary-actions" className="sr-only">
          主要なアクション
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <EntryCta
            href="/notes/new"
            label="メモを書く"
            sublabel="思いついた知識を AI でカード化"
            icon={<Plus className="size-5" />}
            variant="primary"
          />
          <EntryCta
            href="/review"
            label={dueToday > 0 ? `今日の復習 ${dueToday} 枚` : "今日の復習"}
            sublabel={
              dueToday > 0 ? "間隔反復で記憶を定着" : "今日の予定はありません"
            }
            icon={<GraduationCap className="size-5" />}
            variant={dueToday > 0 ? "primary" : "secondary"}
          />
          <EntryCta
            href="/decks"
            label="デッキを見る"
            sublabel="カードを分野ごとに整理"
            icon={<Layers className="size-5" />}
            variant="secondary"
          />
        </div>
      </section>

      {/* ストリーク (継続性の可視化、軽め) */}
      <StreakRing streak={data.streak} />

      {/* 補助統計 (一段下げ、border 控えめ、冗長な数字は削減) */}
      <section
        aria-labelledby="secondary-stats"
        className="rounded-xl bg-muted/30 p-4 md:p-5"
      >
        <h2
          id="secondary-stats"
          className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5"
        >
          <Sparkles className="size-3.5" aria-hidden />
          AI 使用量と総量
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div>
            <dt className="text-xs text-muted-foreground">総カード数</dt>
            <dd className="text-lg font-semibold mt-0.5">
              {data.total_cards}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">新規カード</dt>
            <dd className="text-lg font-semibold mt-0.5">
              {data.new_cards_count}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">今月 AI 呼出</dt>
            <dd className="text-lg font-semibold mt-0.5">
              {data.ai_usage.month_calls}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">今月コスト</dt>
            <dd className="text-lg font-semibold mt-0.5">
              ${data.ai_usage.month_cost_usd.toFixed(4)}
            </dd>
            <dd className="text-[10px] text-muted-foreground">
              約 ¥{monthCostJpyApprox}
            </dd>
          </div>
        </dl>
      </section>

      {/* 最近の更新 (補助情報、最下段) */}
      {(data.recent_notes.length > 0 || data.recent_cards.length > 0) && (
        <details className="group">
          <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 min-h-11 select-none">
            <span className="group-open:rotate-90 transition-transform">▸</span>
            最近の更新を表示
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-3">
            <section aria-labelledby="recent-notes" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3
                  id="recent-notes"
                  className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"
                >
                  <NotebookPen className="size-3.5" aria-hidden />
                  最近のメモ
                </h3>
                <Link
                  href="/notes"
                  className="text-xs underline underline-offset-2 min-h-11 flex items-center"
                >
                  すべて見る
                </Link>
              </div>
              {data.recent_notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  まだメモがありません
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {data.recent_notes.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={`/notes/${n.id}`}
                        className="block rounded-md px-3 py-2 min-h-11 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring line-clamp-2"
                      >
                        {n.body}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="recent-cards" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3
                  id="recent-cards"
                  className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground"
                >
                  <Layers className="size-3.5" aria-hidden />
                  最近のカード
                </h3>
                <Link
                  href="/cards"
                  className="text-xs underline underline-offset-2 min-h-11 flex items-center"
                >
                  すべて見る
                </Link>
              </div>
              {data.recent_cards.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  まだカードがありません
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {data.recent_cards.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cards/${c.id}`}
                        className="block rounded-md px-3 py-2 min-h-11 text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring line-clamp-2"
                      >
                        {c.question}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </details>
      )}
    </div>
  );
}
