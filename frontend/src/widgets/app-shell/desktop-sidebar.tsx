"use client";

import type { ComponentType } from "react";
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
  ShieldCheck,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCurrentUser } from "@/features/auth/api/auth-queries";

const learningItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/notes", label: "メモ", icon: NotebookPen },
  { href: "/chat", label: "チャット", icon: MessagesSquare },
  { href: "/review", label: "復習", icon: GraduationCap },
] as const;

const libraryItems = [
  { href: "/decks", label: "デッキ", icon: Layers },
  { href: "/cards", label: "カード", icon: BookOpen },
  { href: "/templates", label: "テンプレート", icon: FileText },
  { href: "/tags", label: "タグ", icon: Tag },
  { href: "/stats", label: "統計", icon: BarChart3 },
] as const;

const preferenceItems = [
  { href: "/settings", label: "設定", icon: Settings },
] as const;

const adminItem = {
  href: "/admin/users",
  label: "管理",
  icon: ShieldCheck,
} as const;

/**
 * PC 向け左サイドバー (md 以上で表示)
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const { data: me } = useCurrentUser();
  const preferenceNavItems = me?.is_admin
    ? [...preferenceItems, adminItem]
    : preferenceItems;

  return (
    <aside
      aria-label="主要ナビゲーション"
      className="hidden md:flex md:w-56 lg:w-64 border-r flex-col p-3 gap-1
                 md:sticky md:top-0 md:self-start md:h-dvh md:overflow-y-auto"
    >
      <div className="px-3 py-4">
        <div className="bookplate-mark inline-flex size-9 items-center justify-center rounded-sm font-serif text-lg font-semibold">
          ま
        </div>
        <p className="mt-2 text-sm font-semibold">まとメモAI</p>
        <p className="text-xs text-muted-foreground">学習メモを問いに変える作業台</p>
      </div>
      <nav className="space-y-5">
        <NavGroup label="学習" items={learningItems} pathname={pathname} />
        <NavGroup label="整理" items={libraryItems} pathname={pathname} />
        <NavGroup label="運用" items={preferenceNavItems} pathname={pathname} />
      </nav>
      <p className="mt-auto px-3 pb-2 text-[11px] leading-relaxed text-muted-foreground">
        書き、候補を見て、採用したものだけを復習に回します。
      </p>
    </aside>
  );
}

interface NavGroupProps {
  label: string;
  items: readonly {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  }[];
  pathname: string;
}

function NavGroup({ label, items, pathname }: NavGroupProps) {
  return (
    <section aria-label={label} className="space-y-1">
      <h2 className="px-3 text-[11px] font-medium text-muted-foreground">
        {label}
      </h2>
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
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
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
    </section>
  );
}
