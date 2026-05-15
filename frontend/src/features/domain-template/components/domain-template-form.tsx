"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import {
  useCreateDomainTemplate,
  useUpdateDomainTemplate,
} from "../api/domain-template-queries";
import {
  createDomainTemplateSchema,
  type CreateDomainTemplateInput,
} from "../schemas/domain-template-schemas";
import { Button } from "@/shared/ui/button";
import type { DomainTemplate } from "@/entities/domain-template/types";

interface DomainTemplateFormProps {
  template?: DomainTemplate;
  redirectTo?: string;
}

/**
 * 入力した値で実際に AI に渡される「分野ポリシー」ブロックを再構築するプレビュー。
 * (PromptBuilder::systemPrompt の出力と同じフォーマット)
 * domain_hint が空の場合は AI 側でブロックごと省略されるため、その旨を表示する。
 *
 * テストから直接呼び出すため export している (UI 表示の中核ロジック)。
 */
export function buildPolicyPreview(values: CreateDomainTemplateInput): string {
  const hint = values.domain_hint?.trim() ?? "";
  if (hint === "") {
    return "(分野ヒントが空のため、AI には分野ポリシーブロックが渡されません)";
  }
  return [
    `【分野ポリシー: ${values.name?.trim() || "(無名のテンプレート)"}】`,
    hint,
  ].join("\n");
}

export function DomainTemplateForm({
  template,
  redirectTo = "/templates",
}: DomainTemplateFormProps) {
  const router = useRouter();
  const createMutation = useCreateDomainTemplate();
  const updateMutation = useUpdateDomainTemplate(template?.id ?? 0);
  const isEdit = !!template;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateDomainTemplateInput>({
    resolver: zodResolver(createDomainTemplateSchema),
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      domain_hint: template?.domain_hint ?? "",
    },
  });

  const watchedValues = useWatch({ control });
  const previewText = buildPolicyPreview(
    watchedValues as CreateDomainTemplateInput
  );

  const onSubmit = handleSubmit(async (values) => {
    // 空文字列は null として送って backend 側の nullable バリデーションに合わせる。
    const payload = {
      ...values,
      description: values.description?.trim() ? values.description : null,
      domain_hint: values.domain_hint?.trim() ? values.domain_hint : null,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        toast.success("テンプレートを更新しました");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("テンプレートを作成しました");
      }
      router.push(redirectTo);
    } catch {
      toast.error("保存に失敗しました");
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6"
      noValidate
      aria-label={
        isEdit ? "テンプレート編集フォーム" : "テンプレート作成フォーム"
      }
    >
      <div className="rounded-xl bg-primary/5 border-l-4 border-primary p-4 space-y-1">
        <p className="text-sm font-medium flex items-center gap-2 text-primary">
          <Sparkles className="size-4" aria-hidden />
          テンプレートの仕組み
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          「分野ヒント」に書いた 1〜2 文が、AI 候補生成時に
          <strong>分野ポリシー</strong>としてプロンプトに差し込まれます。
          AI への共通ルール (策問原則・2 視点解釈) は別途自動で適用されるため、
          ここでは分野特有のニュアンスだけ書けば十分です。
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          テンプレート名 <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.name}
          placeholder="例: Web 開発 / 応用情報"
        />
        {errors.name && (
          <p role="alert" className="text-xs text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          説明
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (自分用メモ・AI には渡されない)
          </span>
        </label>
        <textarea
          id="description"
          rows={2}
          {...register("description")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
          placeholder="このテンプレートが何のためのものか自分用にメモ"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="domain_hint" className="text-sm font-medium">
          分野ヒント
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (AI に渡される 1〜2 文)
          </span>
        </label>
        <textarea
          id="domain_hint"
          rows={3}
          {...register("domain_hint")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
          aria-invalid={!!errors.domain_hint}
          aria-describedby="domain-hint-help"
          placeholder="例: プログラミングの概念定着が目的。設計意図やトレードオフを軸にし、コード片は最小限にする。"
        />
        <p
          id="domain-hint-help"
          className="text-[11px] text-muted-foreground leading-relaxed"
        >
          目的・優先する切り口・避けたい問い方を 1〜2 文にまとめてください
          (500 字以内)。空欄でもテンプレートは保存できますが、AI には何も
          渡らない動作になります。
        </p>
        {errors.domain_hint && (
          <p role="alert" className="text-xs text-destructive">
            {errors.domain_hint.message}
          </p>
        )}
      </div>

      <section
        aria-labelledby="preview"
        className="space-y-2 rounded-xl bg-muted/40 p-4 md:p-5"
      >
        <h2
          id="preview"
          className="text-sm font-semibold flex items-center gap-2"
        >
          <Sparkles className="size-4 text-primary" aria-hidden />
          プロンプトプレビュー
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (実際に AI に渡される指示)
          </span>
        </h2>
        <pre className="text-xs md:text-sm bg-background border rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
          {previewText}
        </pre>
        <p className="text-[11px] text-muted-foreground">
          このブロックがメモ本文と一緒に AI に送られます。空欄ならブロックごと省略されます。
        </p>
      </section>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          size="lg"
          className="min-h-11"
          disabled={isSubmitting}
        >
          {isSubmitting ? "保存中..." : isEdit ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
}
