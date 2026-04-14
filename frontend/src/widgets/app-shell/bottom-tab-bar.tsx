"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  NotebookPen,
  GraduationCap,
  Settings,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const tabs = [
  { href: "/dashboard", label: "ホーム", icon: LayoutDashboard },
  { href: "/decks", label: "デッキ", icon: Layers },
  { href: "/notes", label: "メモ", icon: NotebookPen },
  { href: "/review", label: "復習", icon: GraduationCap },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

/**
 * モバイル向け下部固定タブバー (md 未満で表示)
 * ネイティブアプリ的な操作感を出す。safe-area 対応。
 */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主要ナビゲーション"
      className="md:hidden sticky bottom-0 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
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
      </ul>
    </nav>
  );
}
