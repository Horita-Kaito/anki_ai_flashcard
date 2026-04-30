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
  Tag,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

const items = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/decks", label: "デッキ", icon: Layers },
  { href: "/cards", label: "カード", icon: BookOpen },
  { href: "/notes", label: "メモ", icon: NotebookPen },
  { href: "/review", label: "復習", icon: GraduationCap },
  { href: "/templates", label: "テンプレート", icon: FileText },
  { href: "/tags", label: "タグ", icon: Tag },
  { href: "/stats", label: "統計", icon: BarChart3 },
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
      className="hidden md:flex md:w-56 lg:w-64 border-r flex-col p-3 gap-1
                 md:sticky md:top-0 md:self-start md:h-dvh md:overflow-y-auto"
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
      <div className="mt-auto px-3 pb-2">
        <ThemeToggle />
      </div>
    </aside>
  );
}
