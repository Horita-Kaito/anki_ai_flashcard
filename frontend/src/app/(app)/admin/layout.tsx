"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/utils";

const subNav = [
  { href: "/admin/users", label: "ユーザー作成" },
  { href: "/admin/system-settings", label: "システム設定" },
] as const;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex-1">
      <nav
        aria-label="管理セクション"
        className="border-b bg-muted/30"
      >
        <ul className="max-w-3xl mx-auto flex gap-1 px-4 md:px-8 overflow-x-auto">
          {subNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors min-h-11",
                    active
                      ? "border-foreground text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
