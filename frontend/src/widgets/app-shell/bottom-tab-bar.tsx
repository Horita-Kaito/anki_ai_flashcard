"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, LogOut } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { cn } from "@/shared/lib/utils";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import {
  useCurrentUser,
  useLogout,
} from "@/features/auth/api/auth-queries";
import {
  learningItems,
  libraryItems,
  preferenceItems,
  adminItem,
  isNavActive,
} from "./nav-config";

/** 主要タブは学習動線の 4 つ */
const tabs = learningItems;

/**
 * モバイル向け下部固定タブバー (md 未満で表示)
 * ネイティブアプリ的な操作感を出す。safe-area 対応。
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: me } = useCurrentUser();
  const logout = useLogout();

  const moreItems = me?.is_admin
    ? [...libraryItems, ...preferenceItems, adminItem]
    : [...libraryItems, ...preferenceItems];

  const moreActive = moreItems.some((item) => isNavActive(pathname, item.href));

  function handleLogout() {
    setMoreOpen(false);
    logout.mutate(undefined, {
      onSuccess: () => router.push("/login"),
    });
  }

  return (
    <nav
      aria-label="主要ナビゲーション"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isNavActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] transition-colors",
                  active
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full px-3 py-0.5 transition-colors",
                    active && "bg-[var(--forest-faint)]"
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}

        {/* その他メニュー */}
        <li className="flex-1">
          <Popover.Root open={moreOpen} onOpenChange={setMoreOpen}>
            <Popover.Trigger
              className={cn(
                "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] transition-colors",
                moreActive
                  ? "font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full px-3 py-0.5 transition-colors",
                  moreActive && "bg-[var(--forest-faint)]"
                )}
              >
                <MoreHorizontal className="size-5" aria-hidden />
              </span>
              <span>その他</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Backdrop className="fixed inset-0 z-[60]" />
              <Popover.Positioner
                side="top"
                align="end"
                sideOffset={8}
                className="z-[70]"
              >
                <Popover.Popup className="min-w-52 rounded-xl border bg-background p-1 shadow-lg">
                  <ul>
                    {moreItems.map((item) => {
                      const active = isNavActive(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                              active
                                ? "bg-[var(--forest-faint)] font-medium text-primary"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            <Icon className="size-4" aria-hidden />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="my-1 border-t" />

                  <div className="flex items-center justify-between gap-2 px-2 py-1">
                    <span className="text-xs text-muted-foreground">
                      {me?.name ?? "アカウント"}
                    </span>
                    <ThemeToggle />
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  >
                    <LogOut className="size-4" aria-hidden />
                    <span>
                      {logout.isPending ? "ログアウト中…" : "ログアウト"}
                    </span>
                  </button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </li>
      </ul>
    </nav>
  );
}
