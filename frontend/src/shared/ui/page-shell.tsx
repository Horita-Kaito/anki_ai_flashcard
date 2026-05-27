import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

const WIDTH_CLASSES = {
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const;

interface PageShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  maxWidth?: keyof typeof WIDTH_CLASSES;
  className?: string;
}

export function PageShell({
  title,
  description,
  action,
  children,
  maxWidth = "5xl",
  className,
}: PageShellProps) {
  return (
    <main className={cn("flex-1 px-4 py-5 pb-6 md:px-8 md:py-8", className)}>
      <div className={cn("mx-auto space-y-6", WIDTH_CLASSES[maxWidth])}>
        <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:justify-end">
              {action}
            </div>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}
