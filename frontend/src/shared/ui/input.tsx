import { cn } from "@/shared/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // SP は 44px タップターゲット + 16px フォント (iOS ズーム防止)、PC はコンパクトに
        "flex h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base transition-colors md:h-10 md:text-sm",
        "placeholder:text-muted-foreground",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  );
}

export { Input };
