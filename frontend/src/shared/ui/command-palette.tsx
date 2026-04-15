"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Layers,
  NotebookPen,
  FileText,
  BarChart3,
  Settings,
  Tag,
  Plus,
  Search,
} from "lucide-react";

/**
 * Cmd+K / Ctrl+K で開くコマンドパレット。
 * ナビゲーション + クイックアクション + (将来) 検索。
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="コマンドパレット"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-background border rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="コマンドパレット" className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <Command.Input
              placeholder="コマンドを検索... (例: デッキ、復習、新規メモ)"
              className="flex-1 h-12 text-base bg-transparent outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden md:inline text-xs px-1.5 py-0.5 border rounded-md bg-muted">
              Esc
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              該当するコマンドがありません
            </Command.Empty>

            <Command.Group heading="移動" className="text-xs text-muted-foreground px-2 pt-2 pb-1">
              <PaletteItem
                icon={<LayoutDashboard className="size-4" />}
                label="ダッシュボード"
                shortcut="g d"
                onSelect={() => navigate("/dashboard")}
              />
              <PaletteItem
                icon={<Layers className="size-4" />}
                label="デッキ"
                onSelect={() => navigate("/decks")}
              />
              <PaletteItem
                icon={<BookOpen className="size-4" />}
                label="カード"
                onSelect={() => navigate("/cards")}
              />
              <PaletteItem
                icon={<NotebookPen className="size-4" />}
                label="メモ"
                onSelect={() => navigate("/notes")}
              />
              <PaletteItem
                icon={<GraduationCap className="size-4" />}
                label="復習セッション"
                onSelect={() => navigate("/review")}
              />
              <PaletteItem
                icon={<FileText className="size-4" />}
                label="分野テンプレート"
                onSelect={() => navigate("/templates")}
              />
              <PaletteItem
                icon={<Tag className="size-4" />}
                label="タグ"
                onSelect={() => navigate("/tags")}
              />
              <PaletteItem
                icon={<BarChart3 className="size-4" />}
                label="学習統計"
                onSelect={() => navigate("/stats")}
              />
              <PaletteItem
                icon={<Settings className="size-4" />}
                label="設定"
                onSelect={() => navigate("/settings")}
              />
            </Command.Group>

            <Command.Group heading="作成" className="text-xs text-muted-foreground px-2 pt-3 pb-1">
              <PaletteItem
                icon={<Plus className="size-4" />}
                label="新しいメモを書く"
                onSelect={() => navigate("/notes/new")}
              />
              <PaletteItem
                icon={<Plus className="size-4" />}
                label="新しいカードを作成"
                onSelect={() => navigate("/cards/new")}
              />
              <PaletteItem
                icon={<Plus className="size-4" />}
                label="新しいデッキを作成"
                onSelect={() => navigate("/decks/new")}
              />
              <PaletteItem
                icon={<Plus className="size-4" />}
                label="新しいテンプレートを作成"
                onSelect={() => navigate("/templates/new")}
              />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({
  icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer aria-selected:bg-muted min-h-11"
    >
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="text-xs px-1.5 py-0.5 border rounded-md bg-muted font-mono">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
