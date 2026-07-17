"use client";

import { ChevronDown } from "lucide-react";
import type { UseFormRegister } from "react-hook-form";
import type { CreateNoteSeedInput } from "../schemas/note-seed-schemas";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

interface NoteSeedAdvancedFieldsProps {
  register: UseFormRegister<CreateNoteSeedInput>;
  open: boolean;
  onToggle: () => void;
}

/**
 * サブ分野・学習目的・補足コンテキストの「詳細設定」。
 * 初心者にはノイズになるため折りたたみ、必要な人だけ開ける。
 */
export function NoteSeedAdvancedFields({
  register,
  open,
  onToggle,
}: NoteSeedAdvancedFieldsProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-[var(--bronze-faint)] px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
        aria-controls="advanced-fields"
      >
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        詳細設定 (任意)
      </button>

      {open && (
        <div
          id="advanced-fields"
          className="grid gap-4 rounded-xl border bg-card p-4 md:grid-cols-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="subdomain">サブ分野</Label>
            <Input
              id="subdomain"
              type="text"
              {...register("subdomain")}
              placeholder="例: 設計パターン"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="learning_goal">学習目的</Label>
            <Textarea
              id="learning_goal"
              rows={2}
              {...register("learning_goal")}
              className="min-h-20"
              placeholder="例: 実務で使い分けを説明できるようにする"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note_context">補足コンテキスト</Label>
            <Textarea
              id="note_context"
              rows={2}
              {...register("note_context")}
              className="min-h-20"
              placeholder="例: 資格試験の頻出範囲"
            />
          </div>
        </div>
      )}
    </div>
  );
}
