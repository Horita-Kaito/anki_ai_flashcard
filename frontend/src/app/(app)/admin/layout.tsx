"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/entities/user/api/queries";
import { cn } from "@/shared/lib/utils";

const subNav = [
  { href: "/admin/users", label: "ユーザー作成" },
  { href: "/admin/system-settings", label: "システム設定" },
] as const;

/**
 * 管理セクションの共通レイアウト。
 *
 * 役割:
 *   1. is_admin 認可の一元化 (各 page-client での重複ロジックを撤去)
 *   2. 管理セクション間のサブナビ表示
 *
 * 二段階防御の観点で API 側にも `can:access-admin` middleware が掛かっているので、
 * クライアント側のリダイレクトをすり抜けても実害はない。ここはあくまで UX 上の
 * 早期離脱用。
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me, isLoading } = useCurrentUser();

  const isForbidden = !isLoading && me !== undefined && !me.is_admin;

  useEffect(() => {
    if (isForbidden) {
      router.replace("/dashboard");
    }
  }, [isForbidden, router]);

  if (isLoading || !me || isForbidden) {
    return (
      <p
        className="p-4 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        読み込み中...
      </p>
    );
  }

  return (
    <div className="flex-1">
      <nav aria-label="管理セクション" className="border-b bg-muted/30">
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
