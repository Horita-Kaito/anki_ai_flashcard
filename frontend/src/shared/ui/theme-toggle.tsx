"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/hooks/use-theme";
import { cn } from "@/shared/lib/utils";

/**
 * Theme toggle button: cycles light -> dark -> system.
 * Compact icon button suitable for header/sidebar placement.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

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
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground min-h-11 min-w-11",
        className
      )}
    >
      {resolvedTheme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}
