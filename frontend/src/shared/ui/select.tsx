import { ChevronDown } from "lucide-react";

import { cn } from "@/shared/lib/utils";

interface NativeSelectProps extends React.ComponentProps<"select"> {
  /** ラッパー div に付与するクラス。幅の制御に使う */
  wrapperClassName?: string;
}

/**
 * ネイティブ <select> の統一スタイル。SP でも OS のピッカーが使えるため、
 * 単純な選択肢はカスタムドロップダウンよりこちらを既定とする。
 */
function NativeSelect({
  className,
  wrapperClassName,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        data-slot="select"
        className={cn(
          "flex h-11 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-base transition-colors md:h-10 md:text-sm",
          "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
