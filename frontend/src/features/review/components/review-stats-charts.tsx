"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReviewStats } from "@/entities/review/types";

interface ReviewStatsChartsProps {
  stats: ReviewStats;
}

const RATING_COLORS = {
  again: "var(--destructive)",
  hard: "var(--chart-4)",
  good: "var(--chart-1)",
  easy: "var(--chart-2)",
} as const;

export function ReviewStatsCharts({ stats }: ReviewStatsChartsProps) {
  const periodData = [
    { name: "今日", reviews: stats.today.completed_count },
    { name: "今週", reviews: stats.week.completed_count },
    { name: "今月", reviews: stats.month.completed_count },
  ];
  const ratingData = [
    { name: "Again", key: "again", value: stats.today.again_count },
    { name: "Hard", key: "hard", value: stats.today.hard_count },
    { name: "Good", key: "good", value: stats.today.good_count },
    { name: "Easy", key: "easy", value: stats.today.easy_count },
  ].filter((item) => item.value > 0);
  const deckData = stats.by_deck
    .slice()
    .sort((a, b) => b.review_count - a.review_count)
    .slice(0, 6)
    .map((deck) => ({
      name: deck.deck_name,
      reviews: deck.review_count,
    }));

  return (
    <section aria-labelledby="review-visuals" className="space-y-3">
      <div>
        <h2 id="review-visuals" className="text-sm font-medium">
          復習の見える化
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          量、つまずき、デッキごとの偏りを確認して次の学習に反映します。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_0.85fr]">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium">期間別レビュー量</h3>
            <p className="text-xs text-muted-foreground">
              今日から今月までの学習ボリューム
            </p>
          </div>
          <div className="h-64" role="img" aria-label="期間別レビュー量の棒グラフ">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="reviews" name="レビュー数" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium">今日の評価分布</h3>
            <p className="text-xs text-muted-foreground">
              つまずきが多い日は短く復習を切り上げやすくします。
            </p>
          </div>
          <div className="h-64" role="img" aria-label="今日の評価分布の円グラフ">
            {ratingData.length === 0 ? (
              <EmptyChartMessage message="今日のレビューはまだありません" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={3}
                  >
                    {ratingData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={RATING_COLORS[entry.key as keyof typeof RATING_COLORS]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {ratingData.length > 0 ? (
            <ul className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              {ratingData.map((entry) => (
                <li key={entry.key} className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: RATING_COLORS[entry.key as keyof typeof RATING_COLORS] }}
                    aria-hidden
                  />
                  <span>{entry.name}</span>
                  <span className="font-medium text-foreground">{entry.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium">デッキ別レビュー量</h3>
          <p className="text-xs text-muted-foreground">
            復習が集中しているデッキと Again 率を並べて確認します。
          </p>
        </div>
        <div className="h-72" role="img" aria-label="デッキ別レビュー量の横棒グラフ">
          {deckData.length === 0 ? (
            <EmptyChartMessage message="まだレビュー履歴がありません" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deckData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="reviews" name="レビュー数" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md bg-muted/30 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

const tooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 24px color-mix(in oklch, var(--foreground), transparent 88%)",
};
