"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import {
  useCurrentUser,
  useLogout,
} from "@/features/auth/api/auth-queries";

interface SidebarUserSectionProps {
  collapsed: boolean;
}

/**
 * サイドバー最下部のユーザーセクション。
 * ユーザー名・テーマ切替・ログアウトを常時操作可能にする (折りたたみ時も)。
 */
export function SidebarUserSection({ collapsed }: SidebarUserSectionProps) {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => router.push("/login"),
    });
  }

  const initial = me?.name?.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "mt-auto border-t border-sidebar-border/60 pt-2",
        collapsed ? "flex flex-col items-center gap-1" : "px-1"
      )}
    >
      {collapsed ? (
        <>
          <div
            aria-hidden
            title={me?.name ?? undefined}
            className="flex size-9 items-center justify-center rounded-full bg-[var(--forest-faint)] text-sm font-semibold text-[var(--forest)]"
          >
            {initial}
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            aria-label="ログアウト"
            title="ログアウト"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <div
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--forest-faint)] text-sm font-semibold text-[var(--forest)]"
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {me?.name ?? "ゲスト"}
              </p>
              {me?.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {me.email}
                </p>
              ) : null}
            </div>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden />
            <span>{logout.isPending ? "ログアウト中…" : "ログアウト"}</span>
          </button>
        </>
      )}
    </div>
  );
}
