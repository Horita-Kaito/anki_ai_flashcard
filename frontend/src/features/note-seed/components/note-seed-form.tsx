"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  useCreateNoteSeed,
  useUpdateNoteSeed,
} from "../api/note-seed-queries";
import {
  createNoteSeedSchema,
  type CreateNoteSeedInput,
} from "../schemas/note-seed-schemas";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { Button } from "@/shared/ui/button";
import type { NoteSeed } from "@/entities/note-seed/types";

interface NoteSeedFormProps {
  note?: NoteSeed;
  redirectTo?: string;
  /** 保存成功時のコールバック。指定時は redirectTo へのリダイレクトをスキップする。 */
  onSuccess?: () => void;
  /** キャンセルボタンのハンドラ。指定時は router.back() の代わりに呼ばれる。 */
  onCancel?: () => void;
}

/**
 * メモ入力フォーム。
 * モバイル: 本文 textarea を大きく、保存ボタンは下部 sticky + safe-area。
 * PC: Cmd/Ctrl+Enter で送信。
 */
export function NoteSeedForm({
  note,
  redirectTo = "/notes",
  onSuccess,
  onCancel,
}: NoteSeedFormProps) {
  const router = useRouter();
  const createMutation = useCreateNoteSeed();
  const updateMutation = useUpdateNoteSeed(note?.id ?? 0);
  const { data: templates } = useDomainTemplateList();
  const isEdit = !!note;
  const [showAdvanced, setShowAdvanced] = useState(
    !!(note?.subdomain || note?.learning_goal || note?.note_context)
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteSeedInput>({
    resolver: zodResolver(createNoteSeedSchema),
    defaultValues: {
      body: note?.body ?? "",
      domain_template_id: note?.domain_template_id ?? null,
      subdomain: note?.subdomain ?? "",
      learning_goal: note?.learning_goal ?? "",
      note_context: note?.note_context ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      ...values,
      domain_template_id: values.domain_template_id || null,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        toast.success("メモを更新しました");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("メモを保存しました");
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
      }
    } catch {
      toast.error("保存に失敗しました");
    }
  });

  // PC 向け: Cmd/Ctrl+Enter で送信
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-5 pb-36 md:pb-0"
      noValidate
      aria-label={isEdit ? "メモ編集フォーム" : "メモ作成フォーム"}
    >
      <div className="space-y-1.5">
        <label htmlFor="body" className="text-sm font-medium">
          メモ本文 <span className="text-destructive">*</span>
        </label>
        <textarea
          id="body"
          rows={8}
          {...register("body")}
          className="w-full border rounded-md px-3 py-3 text-base md:text-sm min-h-40 resize-y leading-relaxed"
          placeholder="学習中に気になった知識の断片を書き留めてください..."
          aria-invalid={!!errors.body}
          autoFocus
        />
        {errors.body && (
          <p role="alert" className="text-xs text-destructive">
            {errors.body.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          PC: Cmd/Ctrl + Enter で保存
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="domain_template_id" className="text-sm font-medium">
          分野テンプレート
        </label>
        <select
          id="domain_template_id"
          {...register("domain_template_id", {
            setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
          })}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
        >
          <option value="">指定しない</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground min-h-11"
        aria-expanded={showAdvanced}
        aria-controls="advanced-fields"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          aria-hidden
        />
        詳細設定 (任意)
      </button>

      {showAdvanced && (
        <div id="advanced-fields" className="space-y-4 pl-6 border-l">
          <div className="space-y-1.5">
            <label htmlFor="subdomain" className="text-sm font-medium">
              サブ分野
            </label>
            <input
              id="subdomain"
              type="text"
              {...register("subdomain")}
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
              placeholder="例: 設計パターン"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="learning_goal" className="text-sm font-medium">
              学習目的
            </label>
            <textarea
              id="learning_goal"
              rows={2}
              {...register("learning_goal")}
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="note_context" className="text-sm font-medium">
              補足コンテキスト
            </label>
            <textarea
              id="note_context"
              rows={2}
              {...register("note_context")}
              className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
            />
          </div>
        </div>
      )}

      {/* モバイル: sticky 下部バー / PC: インライン */}
      <div
        className="
          fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t bg-background/95 backdrop-blur z-30
          p-3 flex gap-2
          md:static md:border-0 md:bg-transparent md:backdrop-blur-0
          md:p-0 md:pb-0 md:justify-end md:flex-row-reverse
        "
      >
        <Button
          type="submit"
          size="lg"
          className="flex-1 md:flex-none min-h-11"
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : isEdit ? "更新" : "保存"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
