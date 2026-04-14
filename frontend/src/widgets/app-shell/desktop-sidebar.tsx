"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  NotebookPen,
  GraduationCap,
  Settings,
  FileText,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const items = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/decks", label: "デッキ", icon: Layers },
  { href: "/notes", label: "メモ", icon: NotebookPen },
  { href: "/review", label: "復習", icon: GraduationCap },
  { href: "/templates", label: "テンプレート", icon: FileText },
  { href: "/settings", label: "設定", icon: Settings },
] as const;

/**
 * PC 向け左サイドバー (md 以上で表示)
 */
export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="主要ナビゲーション"
      className="hidden md:flex md:w-56 lg:w-64 border-r flex-col p-3 gap-1"
    >
      <div className="px-3 py-4 font-bold text-lg tracking-tight">
        Anki AI Flashcard
      </div>
      <nav>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors min-h-11",
                    active
                      ? "bg-muted text-foreground font-medium"
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
      </nav>
    </aside>
  );
}
