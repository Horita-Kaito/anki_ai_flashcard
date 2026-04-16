"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/hooks/use-theme";
import { cn } from "@/shared/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label =
    theme === "light"
      ? "ダークモードに切替"
      : theme === "dark"
        ? "システム設定に切替"
        : "ライトモードに切替";

  return (
    <button
      type="button"
      aria-label={mounted ? label : "テーマ切替"}
      title={mounted ? label : "テーマ切替"}
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 min-w-11",
        className
      )}
    >
      {!mounted ? (
        <span className="size-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </button>
  );
}
