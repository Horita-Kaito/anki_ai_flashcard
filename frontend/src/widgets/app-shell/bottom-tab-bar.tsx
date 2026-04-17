"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Layers,
  NotebookPen,
  GraduationCap,
  MoreHorizontal,
  BookOpen,
  FileText,
  Tag,
  BarChart3,
  Settings,
} from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { cn } from "@/shared/lib/utils";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

const tabs = [
  { href: "/dashboard", label: "ホーム", icon: LayoutDashboard },
  { href: "/decks", label: "デッキ", icon: Layers },
  { href: "/notes", label: "メモ", icon: NotebookPen },
  { href: "/review", label: "復習", icon: GraduationCap },
] as const;

const moreItems = [
  { href: "/cards", label: "カード", icon: BookOpen },
  { href: "/templates", label: "テンプレート", icon: FileText },
  { href: "/tags", label: "タグ", icon: Tag },
  { href: "/stats", label: "統計", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

/**
 * モバイル向け下部固定タブバー (md 未満で表示)
 * ネイティブアプリ的な操作感を出す。safe-area 対応。
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <nav
      aria-label="主要ナビゲーション"
      className="md:hidden sticky bottom-0 z-50 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 text-xs",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
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
                "flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 text-xs w-full",
                moreActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className="size-5" aria-hidden />
              <span>その他</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Backdrop className="fixed inset-0 z-40" />
              <Popover.Positioner side="top" align="end" sideOffset={8} className="z-50">
                <Popover.Popup className="min-w-48 rounded-lg border bg-background p-1 shadow-lg">
                  <ul>
                    {moreItems.map((item) => {
                      const active = pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm min-h-11 transition-colors",
                              active
                                ? "text-foreground font-medium bg-muted"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                          >
                            <Icon className="size-4" aria-hidden />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t mt-1 pt-1 px-1">
                    <ThemeToggle className="w-full justify-start min-h-11 px-2" />
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </li>
      </ul>
    </nav>
  );
}
