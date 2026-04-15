"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

/**
 * モバイル専用の Floating Action Button。
 * 現在のコンテキストに応じて主要な作成アクションにワンタップで到達する。
 *
 * 例:
 *   /notes* → 新規メモ
 *   /decks* → 新規デッキ
 *   /cards* → 新規カード
 *   それ以外 → 新規メモ (最頻アクション)
 */
export function Fab() {
  const pathname = usePathname();

  const { href, label } = resolveAction(pathname);

  return (
    <Link
      href={href}
      aria-label={label}
      className="
        md:hidden fixed right-4 z-40
        bottom-[calc(env(safe-area-inset-bottom)+4.5rem)]
        size-14 rounded-full bg-primary text-primary-foreground
        shadow-lg flex items-center justify-center
        hover:bg-primary/90 active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        transition-all
      "
    >
      <Plus className="size-6" aria-hidden />
    </Link>
  );
}

function resolveAction(pathname: string): { href: string; label: string } {
  if (pathname.startsWith("/decks")) {
    return { href: "/decks/new", label: "新しいデッキを作成" };
  }
  if (pathname.startsWith("/cards")) {
    return { href: "/cards/new", label: "新しいカードを作成" };
  }
  if (pathname.startsWith("/templates")) {
    return { href: "/templates/new", label: "新しいテンプレートを作成" };
  }
  // メモ画面 or その他ではメモ作成 (最頻アクション)
  return { href: "/notes/new", label: "新しいメモを書く" };
}
