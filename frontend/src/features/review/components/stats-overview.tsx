"use client";

import { BarChart3, TrendingDown } from "lucide-react";
import { useReviewStats } from "../api/review-queries";

function StatBox({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="border rounded-xl p-4 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}

export function StatsOverview() {
  const { data, isLoading, isError } = useReviewStats();

  if (isLoading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (isError || !data) {
    return (
      <p role="alert" className="text-destructive">
        統計の読み込みに失敗しました
      </p>
    );
  }

  const todayTotal = data.today.completed_count;
  const todayAgainRate =
    todayTotal > 0 ? (data.today.again_count / todayTotal) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 今日 */}
      <section aria-labelledby="stats-today" className="space-y-3">
        <h2 id="stats-today" className="text-sm font-medium text-muted-foreground">
          今日
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="完了" value={todayTotal} />
          <StatBox
            label="Again"
            value={data.today.again_count}
            sublabel={`${todayAgainRate.toFixed(0)}%`}
          />
          <StatBox label="Good" value={data.today.good_count} />
          <StatBox label="Easy" value={data.today.easy_count} />
        </div>
      </section>

      {/* 期間別 */}
      <section aria-labelledby="stats-periods" className="space-y-3">
        <h2
          id="stats-periods"
          className="text-sm font-medium text-muted-foreground"
        >
          期間別
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatBox label="今週の復習" value={data.week.completed_count} />
          <StatBox
            label="今週の Again 率"
            value={`${(data.week.again_rate * 100).toFixed(1)}%`}
          />
          <StatBox label="今月の復習" value={data.month.completed_count} />
        </div>
      </section>

      {/* デッキ別 */}
      <section aria-labelledby="stats-decks" className="space-y-3">
        <h2
          id="stats-decks"
          className="text-sm font-medium text-muted-foreground flex items-center gap-2"
        >
          <BarChart3 className="size-4" aria-hidden />
          デッキ別
        </h2>
        {data.by_deck.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            まだレビュー履歴がありません
          </p>
        ) : (
          <ul className="space-y-2">
            {data.by_deck.map((d) => {
              const againPct = d.again_rate * 100;
              const isRisky = againPct > 30;
              return (
                <li
                  key={d.deck_id}
                  className="border rounded-xl p-3 md:p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{d.deck_name}</p>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isRisky ? "bg-destructive" : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min(100, (d.review_count / Math.max(...data.by_deck.map((x) => x.review_count))) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{d.review_count}</p>
                    <p
                      className={`text-xs flex items-center gap-1 ${
                        isRisky ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {isRisky && <TrendingDown className="size-3" aria-hidden />}
                      Again {againPct.toFixed(0)}%
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 累計 */}
      <section aria-labelledby="stats-overall" className="space-y-3">
        <h2
          id="stats-overall"
          className="text-sm font-medium text-muted-foreground"
        >
          累計
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <StatBox label="総レビュー数" value={data.overall.total_reviews} />
        </div>
      </section>
    </div>
  );
}
