import type { ComponentType } from "react";
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

export type NavIcon = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
}>;

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: NavIcon;
}

/** 学習の中核動線 (デスクトップ・モバイル共通の主要タブ) */
export const learningItems: readonly NavItem[] = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/notes", label: "メモ", icon: NotebookPen },
  { href: "/chat", label: "チャット", icon: MessagesSquare },
  { href: "/review", label: "復習", icon: GraduationCap },
];

/** ライブラリ (整理系) */
export const libraryItems: readonly NavItem[] = [
  { href: "/decks", label: "デッキ", icon: Layers },
  { href: "/cards", label: "カード", icon: BookOpen },
  { href: "/templates", label: "テンプレート", icon: FileText },
  { href: "/tags", label: "タグ", icon: Tag },
  { href: "/stats", label: "統計", icon: BarChart3 },
];

/** 運用系 */
export const preferenceItems: readonly NavItem[] = [
  { href: "/settings", label: "設定", icon: Settings },
];

export const adminItem: NavItem = {
  href: "/admin/users",
  label: "管理",
  icon: ShieldCheck,
};

/** パスがナビ項目に一致するか (前方一致) */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
