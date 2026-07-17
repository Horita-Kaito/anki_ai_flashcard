"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useCurrentUser } from "@/features/auth/api/auth-queries";
import {
  learningItems,
  libraryItems,
  preferenceItems,
  adminItem,
  isNavActive,
  type NavItem,
} from "./nav-config";
import { SidebarUserSection } from "./sidebar-user-section";

/**
 * PC 向け左サイドバー (md 以上で表示)
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const { data: me } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("tessera.sidebar.collapsed") === "true"
  );
  const preferenceNavItems = me?.is_admin
    ? [...preferenceItems, adminItem]
    : preferenceItems;

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("tessera.sidebar.collapsed", String(next));
      return next;
    });
  }

  return (
    <aside
      aria-label="主要ナビゲーション"
      className={cn(
        "hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:sticky md:top-0 md:flex md:h-dvh md:self-start md:flex-col md:overflow-y-auto",
        collapsed ? "md:w-[4.5rem] p-2" : "md:w-56 lg:w-64 p-3"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          collapsed ? "justify-center py-1" : "px-2 py-2"
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Tessera ホーム"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "hidden"
          )}
        >
          <div className="bookplate-mark inline-flex size-9 shrink-0 items-center justify-center rounded-sm font-serif text-lg font-semibold">
            ま
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Tessera</p>
            <p className="truncate text-xs text-muted-foreground">
              学習を記憶に変える
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
          aria-pressed={collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
        </button>
      </div>

      <nav className="mt-2 space-y-5">
        <NavGroup
          label="学習"
          items={learningItems}
          pathname={pathname}
          collapsed={collapsed}
        />
        <NavGroup
          label="整理"
          items={libraryItems}
          pathname={pathname}
          collapsed={collapsed}
        />
        <NavGroup
          label="運用"
          items={preferenceNavItems}
          pathname={pathname}
          collapsed={collapsed}
        />
      </nav>

      <SidebarUserSection collapsed={collapsed} />
    </aside>
  );
}

interface NavGroupProps {
  label: string;
  items: readonly NavItem[];
  pathname: string;
  collapsed: boolean;
}

function NavGroup({ label, items, pathname, collapsed }: NavGroupProps) {
  return (
    <section aria-label={label} className="space-y-1">
      <h2
        className={cn(
          "px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80",
          collapsed && "sr-only"
        )}
      >
        {label}
      </h2>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg text-sm transition-colors",
                  collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                  active
                    ? "bg-[var(--forest-faint)] font-medium text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className={cn(collapsed && "sr-only")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
