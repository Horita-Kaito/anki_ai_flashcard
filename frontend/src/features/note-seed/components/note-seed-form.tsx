"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRef, useState } from "react";
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
import { MarkdownText } from "@/shared/ui/markdown-text";
import type { NoteSeed } from "@/entities/note-seed/types";

type BodyTab = "edit" | "preview";

type SubmitAction = "save" | "save-and-generate";

interface NoteSeedFormProps {
  note?: NoteSeed;
  redirectTo?: string;
  /**
   * 保存成功時のコールバック。指定時は redirectTo へのリダイレクトをスキップする。
   * 引数として作成/更新された NoteSeed を受け取る。
   */
  onSuccess?: (note: NoteSeed) => void | Promise<void>;
  /** キャンセルボタンのハンドラ。指定時は router.back() の代わりに呼ばれる。 */
  onCancel?: () => void;
  /**
   * 「保存して候補生成」アクションのハンドラ。
   * 渡された場合のみ create モードで対応ボタンが追加表示される。
   * 通常 page 側で AI 候補生成 dispatch + 遷移をハンドルする。
   */
  onSaveAndGenerate?: (note: NoteSeed) => void | Promise<void>;
  /**
   * true の時、保存後に redirect/onSuccess の代わりに本文だけ空にして
   * 同じフォームから連続でメモを書けるようにする。
   * 詳細設定 (テンプレート/サブ分野/学習目的/コンテキスト) は保持する。
   * このモードでは「保存」単体ボタンは非表示にし、「保存して候補生成」だけを残す。
   */
  shouldResetAfterSave?: boolean;
}

/**
 * メモ入力フォーム。
 * モバイル: 本文 textarea を大きく、保存ボタンは下部 sticky + safe-area。
 * PC: Cmd/Ctrl+Enter で送信。
 *
 * create モードでは onSaveAndGenerate を渡すと「保存して候補生成」ボタンが現れ、
 * shouldResetAfterSave を ON にすると保存後フォーム reset で連続作成できる。
 */
export function NoteSeedForm({
  note,
  redirectTo = "/notes",
  onSuccess,
  onCancel,
  onSaveAndGenerate,
  shouldResetAfterSave = false,
}: NoteSeedFormProps) {
  const router = useRouter();
  const createMutation = useCreateNoteSeed();
  const updateMutation = useUpdateNoteSeed(note?.id ?? 0);
  const { data: templates } = useDomainTemplateList();
  const isEdit = !!note;
  const [showAdvanced, setShowAdvanced] = useState(
    !!(note?.subdomain || note?.learning_goal || note?.note_context)
  );
  const [bodyTab, setBodyTab] = useState<BodyTab>("edit");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // どのボタンで submit したかを onSubmit 側で判別するためのフラグ。
  // ref を使うのは render を引き起こさず、かつ submit イベントと同期させたいため。
  const submitActionRef = useRef<SubmitAction>("save");

  const showSaveAndGenerate = !isEdit && !!onSaveAndGenerate;
  const showSaveOnly = !shouldResetAfterSave;

  const {
    register,
    handleSubmit,
    control,
    reset,
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
    const action = submitActionRef.current;
    try {
      const saved = isEdit
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);
      toast.success(isEdit ? "メモを更新しました" : "メモを保存しました");

      if (action === "save-and-generate" && onSaveAndGenerate) {
        await onSaveAndGenerate(saved);
      } else if (onSuccess) {
        await onSuccess(saved);
      } else if (!shouldResetAfterSave) {
        router.push(redirectTo);
      }

      if (shouldResetAfterSave) {
        // 本文だけクリアし、詳細設定 (テンプレート/サブ分野/学習目的/コンテキスト) は保持。
        reset({
          body: "",
          domain_template_id: values.domain_template_id,
          subdomain: values.subdomain,
          learning_goal: values.learning_goal,
          note_context: values.note_context,
        });
        setBodyTab("edit");
        requestAnimationFrame(() => textareaRef.current?.focus());
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      // 次回 submit でフラグが残らないようリセット
      submitActionRef.current = "save";
    }
  });

  // PC 向け: Cmd/Ctrl+Enter で送信 (デフォルトの primary ボタン動作)
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      // 連続モード時は primary が save-and-generate なのでそちらを発火
      submitActionRef.current =
        shouldResetAfterSave && showSaveAndGenerate ? "save-and-generate" : "save";
      onSubmit();
    }
  }

  const { ref: bodyRefCallback, ...bodyRegister } = register("body");
  function setBodyTextareaRef(el: HTMLTextAreaElement | null) {
    bodyRefCallback(el);
    textareaRef.current = el;
  }
  function switchBodyTab(next: BodyTab) {
    setBodyTab(next);
    if (next === "edit") {
      // hidden 解除後に focus を当てるため次フレームで実行
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }
  const bodyValue = useWatch({ control, name: "body" });

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-5 pb-36 md:pb-0"
      noValidate
      aria-label={isEdit ? "メモ編集フォーム" : "メモ作成フォーム"}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="body" className="text-sm font-medium">
            メモ本文 <span className="text-destructive">*</span>
          </label>
          <div
            role="tablist"
            aria-label="本文の表示モード切替"
            className="flex border rounded-md p-0.5 bg-muted/50 text-xs"
          >
            <button
              type="button"
              role="tab"
              id="body-tab-edit"
              aria-selected={bodyTab === "edit"}
              aria-controls="body-panel-edit"
              tabIndex={bodyTab === "edit" ? 0 : -1}
              onClick={() => switchBodyTab("edit")}
              className={`px-3 min-h-8 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                bodyTab === "edit"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              編集
            </button>
            <button
              type="button"
              role="tab"
              id="body-tab-preview"
              aria-selected={bodyTab === "preview"}
              aria-controls="body-panel-preview"
              tabIndex={bodyTab === "preview" ? 0 : -1}
              onClick={() => switchBodyTab("preview")}
              className={`px-3 min-h-8 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                bodyTab === "preview"
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              プレビュー
            </button>
          </div>
        </div>
        <div
          id="body-panel-edit"
          role="tabpanel"
          aria-labelledby="body-tab-edit"
          hidden={bodyTab !== "edit"}
        >
          <textarea
            id="body"
            rows={8}
            {...bodyRegister}
            ref={setBodyTextareaRef}
            className="w-full border rounded-md px-3 py-3 text-base md:text-sm min-h-40 resize-y leading-relaxed"
            placeholder="学習中に気になった知識の断片を書き留めてください..."
            aria-invalid={!!errors.body}
            autoFocus
          />
        </div>
        <div
          id="body-panel-preview"
          role="tabpanel"
          aria-labelledby="body-tab-preview"
          hidden={bodyTab !== "preview"}
          className="border rounded-md px-3 py-3 min-h-40 bg-muted/20"
        >
          {bodyValue ? (
            <MarkdownText text={bodyValue} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              プレビューするメモがありません
            </p>
          )}
        </div>
        {errors.body && (
          <p role="alert" className="text-xs text-destructive">
            {errors.body.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Markdown 記法対応 / PC: Cmd/Ctrl + Enter で保存
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
        {showSaveAndGenerate && (
          <Button
            type="submit"
            size="lg"
            className="flex-1 md:flex-none min-h-11"
            disabled={isSubmitting}
            onClick={() => {
              submitActionRef.current = "save-and-generate";
            }}
          >
            {isSubmitting ? "処理中..." : "保存して候補生成"}
          </Button>
        )}
        {showSaveOnly && (
          <Button
            type="submit"
            size="lg"
            variant={showSaveAndGenerate ? "outline" : "default"}
            className="flex-1 md:flex-none min-h-11"
            disabled={isSubmitting}
            onClick={() => {
              submitActionRef.current = "save";
            }}
          >
            {isSubmitting ? "保存中..." : isEdit ? "更新" : "保存"}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
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
