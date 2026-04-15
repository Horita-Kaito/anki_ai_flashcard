"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  SCOPE_LABELS,
  SHORTCUTS_BY_SCOPE,
  type ShortcutDef,
} from "@/shared/config/shortcuts";

/**
 * `?` キーで開くショートカット一覧モーダル。
 * アクセシビリティ: role="dialog", aria-modal, ESC で閉じる、フォーカストラップ。
 */
export function ShortcutHelpDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      // input/textarea フォーカス中は無視
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-background border rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto p-5 md:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="shortcut-title" className="text-lg font-semibold">
            キーボードショートカット
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-2 hover:bg-muted size-10 flex items-center justify-center"
            aria-label="閉じる"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-5">
          {(Object.keys(SHORTCUTS_BY_SCOPE) as ShortcutDef["scope"][]).map(
            (scope) => {
              const items = SHORTCUTS_BY_SCOPE[scope];
              if (items.length === 0) return null;
              return (
                <section key={scope}>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">
                    {SCOPE_LABELS[scope]}
                  </h3>
                  <ul className="space-y-1.5">
                    {items.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span>{s.description}</span>
                        <span className="flex gap-1 shrink-0">
                          {s.keys.map((k) => (
                            <kbd
                              key={k}
                              className="px-1.5 py-0.5 text-xs font-mono border rounded-md bg-muted"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-2 border-t">
          <kbd className="px-1.5 py-0.5 text-xs font-mono border rounded-md bg-muted">
            ?
          </kbd>{" "}
          でこのダイアログを開閉できます
        </p>
      </div>
    </div>
  );
}
