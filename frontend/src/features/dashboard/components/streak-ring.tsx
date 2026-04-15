"use client";

import { Flame } from "lucide-react";
import type { StreakInfo } from "@/entities/dashboard/types";

interface StreakRingProps {
  streak: StreakInfo;
  /** 何日連続で「達成」と表示するか (デフォルト: 7日) */
  goalDays?: number;
}

/**
 * 連続学習日数 (ストリーク) を SVG リングで表示。
 * Duolingo / Apple Watch アクティビティを参考にした視覚化。
 */
export function StreakRing({ streak, goalDays = 7 }: StreakRingProps) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = Math.min(streak.current / goalDays, 1);
  const offset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-4 border rounded-xl p-4 md:p-5 bg-card">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* 背景リング */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            className="text-muted opacity-30"
          />
          {/* 進捗リング */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={
              streak.today_done
                ? "text-orange-500 transition-all duration-700"
                : "text-muted-foreground transition-all duration-700"
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Flame
            className={`size-4 ${
              streak.today_done ? "text-orange-500" : "text-muted-foreground"
            }`}
            aria-hidden
          />
          <span className="text-xl font-bold leading-none mt-0.5">
            {streak.current}
          </span>
          <span className="text-[10px] text-muted-foreground">日</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {streak.today_done
            ? "今日もよく続けました 🔥"
            : "今日の復習で連続日数を伸ばそう"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          連続 {streak.current} 日 / 最長 {streak.longest} 日
        </p>
      </div>
    </div>
  );
}
