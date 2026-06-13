"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardSummary } from "@/entities/dashboard/types";

interface DashboardLearningChartsProps {
  summary: DashboardSummary;
  pendingReview: number;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
] as const;

export function DashboardLearningCharts({
  summary,
  pendingReview,
}: DashboardLearningChartsProps) {
  const learningData = [
    { name: "今日の復習", value: summary.due_count_today },
    { name: "レビュー待ち", value: pendingReview },
    { name: "新規カード", value: summary.new_cards_count },
    { name: "総カード", value: summary.total_cards },
  ];
  const aiData = [
    { name: "今日", calls: summary.ai_usage.today_calls },
    { name: "今月", calls: summary.ai_usage.month_calls },
  ];

  return (
    <section aria-labelledby="learning-visuals" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="learning-visuals" className="text-sm font-medium">
            学習の見える化
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            今日やることと、積み上がっている学習量をひと目で確認できます。
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium">学習状態</h3>
              <p className="text-xs text-muted-foreground">
                次の行動につながるカード量
              </p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {summary.total_cards} cards
            </span>
          </div>
          <div className="h-64 md:h-72" role="img" aria-label="学習状態の棒グラフ">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={learningData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {learningData.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium">AI 活用</h3>
            <p className="text-xs text-muted-foreground">
              メモからカード候補へ変換した作業量
            </p>
          </div>
          <div className="h-64 md:h-72" role="img" aria-label="AI呼び出し回数の面グラフ">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aiData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiCallsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
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
                <Tooltip cursor={{ stroke: "var(--chart-2)" }} contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="calls"
                  name="呼び出し"
                  stroke="var(--chart-2)"
                  fill="url(#aiCallsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

const tooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  boxShadow: "0 8px 24px color-mix(in oklch, var(--foreground), transparent 88%)",
};
