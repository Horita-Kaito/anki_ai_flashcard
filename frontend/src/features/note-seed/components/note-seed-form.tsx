"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { NoteSeedBodyField } from "./note-seed-body-field";
import { NoteSeedAdvancedFields } from "./note-seed-advanced-fields";
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
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/select";
import type { NoteSeed } from "@/entities/note-seed/types";

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
 * モバイル: 本文 textarea を主役にし、アクションは下部 sticky バー (safe-area 対応)。
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
  // どのボタンで submit したかを onSubmit 側で判別するためのフラグ。
  // ref を使うのは render を引き起こさず、かつ submit イベントと同期させたいため。
  const submitActionRef = useRef<SubmitAction>("save");

  const showSaveAndGenerate = !isEdit && !!onSaveAndGenerate;
  const showSaveOnly = !shouldResetAfterSave;

  const {
    register,
    handleSubmit,
    control,
    getValues,
    reset,
    setValue,
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
        shouldResetAfterSave && showSaveAndGenerate
          ? "save-and-generate"
          : "save";
      onSubmit();
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={handleKeyDown}
      className="space-y-5 pb-40 md:pb-0"
      noValidate
      aria-label={isEdit ? "メモ編集フォーム" : "メモ作成フォーム"}
    >
      <NoteSeedBodyField
        register={register}
        control={control}
        getValues={getValues}
        setValue={setValue}
        errorMessage={errors.body?.message}
        autoFocus
      />

      <div className="space-y-1.5 rounded-xl border bg-card p-4">
        <Label htmlFor="domain_template_id">分野テンプレート</Label>
        <NativeSelect
          id="domain_template_id"
          {...register("domain_template_id", {
            setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
          })}
        >
          <option value="">指定しない</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">
          策問の観点をテンプレートで指定できます。未指定でも生成できます。
        </p>
      </div>

      <NoteSeedAdvancedFields
        register={register}
        open={showAdvanced}
        onToggle={() => setShowAdvanced((v) => !v)}
      />

      {/* モバイル: sticky 下部バー (safe-area 対応) / PC: インライン右寄せ */}
      <div
        className="
          fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-[1.6fr_1fr_auto] gap-2 border-t bg-background/95 p-3 backdrop-blur
          md:static md:flex md:flex-row-reverse md:justify-end md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0
        "
      >
        {showSaveAndGenerate && (
          <Button
            type="submit"
            size="touch"
            className="min-h-12 md:min-w-56"
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
            size="touch"
            variant={showSaveAndGenerate ? "outline" : "default"}
            className="min-h-12 md:min-w-36"
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
          size="touch"
          onClick={() => (onCancel ? onCancel() : router.back())}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
