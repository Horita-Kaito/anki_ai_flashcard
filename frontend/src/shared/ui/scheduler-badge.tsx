import { SCHEDULER_LABELS, type Scheduler } from "@/entities/card/types";

interface SchedulerBadgeProps {
  scheduler: Scheduler;
  /** デフォルト 'sm' (small)。サイズ感は xs (微小) / sm (デフォルト) を選べる */
  size?: "xs" | "sm";
}

/**
 * カードに割り当てられた復習アルゴリズム (SM-2 / FSRS) を示す小さなバッジ。
 * 同一画面に SM-2 と FSRS のカードが混在する場面で挙動の違いを可視化する。
 */
export function SchedulerBadge({
  scheduler,
  size = "sm",
}: SchedulerBadgeProps) {
  const label = scheduler === "fsrs" ? "FSRS" : "SM-2";
  const tone =
    scheduler === "fsrs"
      ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
      : "bg-muted text-muted-foreground";
  const sizing =
    size === "xs"
      ? "text-[10px] px-1.5 py-0"
      : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${tone} ${sizing}`}
      title={SCHEDULER_LABELS[scheduler]}
      aria-label={`復習アルゴリズム: ${SCHEDULER_LABELS[scheduler]}`}
    >
      {label}
    </span>
  );
}
