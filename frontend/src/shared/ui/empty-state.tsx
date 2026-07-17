import { cn } from "@/shared/lib/utils";

interface EmptyStateProps {
  /** lucide アイコンなどの装飾。tinted circle 内に描画される */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** 次に取るべきアクション (Button や Link)。空状態は必ず次の一歩を示す */
  action?: React.ReactNode;
  className?: string;
}

/**
 * ガイド付き空状態。「何もない」ではなく「次に何をすればよいか」を必ず伝える。
 */
function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center md:py-14",
        className
      )}
    >
      {icon && (
        <div
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-[var(--forest-faint)] text-[var(--forest)] [&_svg]:size-6"
        >
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-base font-semibold">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
