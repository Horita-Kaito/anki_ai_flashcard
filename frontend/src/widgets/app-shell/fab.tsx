"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

/** FAB を非表示にするパス (フォームや固定ボタンバーと重なるため) */
const hiddenPatterns = [
  /^\/\w+\/new$/,       // /notes/new, /decks/new, /cards/new, /templates/new
  /^\/\w+\/\d+$/,       // /notes/123, /cards/123 (編集画面)
  /^\/chat$/,            // チャット入力欄
  /^\/review$/,          // 復習セッション
  /^\/settings$/,        // 設定
];

export function Fab() {
  const pathname = usePathname();

  if (hiddenPatterns.some((p) => p.test(pathname))) {
    return null;
  }

  const action = resolveAction(pathname);
  // 文脈に合う作成アクションがないページでは FAB を出さない
  // (タグ管理や統計画面に「メモを書く」FAB が浮くのを避ける)
  if (action === null) {
    return null;
  }
  const { href, label } = action;

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

function resolveAction(
  pathname: string
): { href: string; label: string } | null {
  if (pathname.startsWith("/decks")) {
    return { href: "/decks/new", label: "新しいデッキを作成" };
  }
  if (pathname.startsWith("/cards")) {
    return { href: "/cards/new", label: "新しいカードを作成" };
  }
  if (pathname.startsWith("/templates")) {
    return { href: "/templates/new", label: "新しいテンプレートを作成" };
  }
  // コア動線 (ホーム/メモ) ではメモ作成が最頻アクション
  if (pathname.startsWith("/notes") || pathname.startsWith("/dashboard")) {
    return { href: "/notes/new", label: "新しいメモを書く" };
  }
  return null;
}
