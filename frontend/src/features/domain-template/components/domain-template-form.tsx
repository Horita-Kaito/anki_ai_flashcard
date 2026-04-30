"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, Sparkles, Target, Type } from "lucide-react";
import {
  useCreateDomainTemplate,
  useUpdateDomainTemplate,
} from "../api/domain-template-queries";
import {
  createDomainTemplateSchema,
  type CreateDomainTemplateInput,
} from "../schemas/domain-template-schemas";
import { StringListField } from "./string-list-field";
import { Button } from "@/shared/ui/button";
import { CARD_TYPES, CARD_TYPE_LABELS } from "@/entities/card/types";
import type { DomainTemplate } from "@/entities/domain-template/types";

interface DomainTemplateFormProps {
  template?: DomainTemplate;
  redirectTo?: string;
}

/**
 * 「この値は AI プロンプトでこう使われる」を 1 行で説明するヘルパー文。
 * バックエンドの PromptBuilder::formatInstruction と歩調を合わせる。
 */
function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground leading-relaxed">
      <span className="text-primary font-medium">→ AI への指示:</span> {children}
    </p>
  );
}

/**
 * 入力した値で実際に AI に渡される「分野ポリシー」ブロックを再構築するプレビュー。
 * (PromptBuilder::formatInstruction の出力と同じフォーマット)
 */
function buildPolicyPreview(values: CreateDomainTemplateInput): string {
  const lines: string[] = [];
  const i = values.instruction_json;
  if (i.goal?.trim()) lines.push(`目的: ${i.goal.trim()}`);

  const priorities = (i.priorities ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  if (priorities.length > 0) {
    lines.push(`優先観点: ${priorities.join(" / ")}`);
  }

  const avoid = (i.avoid ?? []).map((s) => s.trim()).filter(Boolean);
  if (avoid.length > 0) {
    lines.push(`避けたい問い方: ${avoid.join(" / ")}`);
  }

  if (i.answer_style?.trim())
    lines.push(`回答スタイル: ${i.answer_style.trim()}`);
  if (i.difficulty_policy?.trim())
    lines.push(`難易度方針: ${i.difficulty_policy.trim()}`);
  if (i.note_interpretation_policy?.trim())
    lines.push(`メモ解釈方針: ${i.note_interpretation_policy.trim()}`);

  if (lines.length === 0) {
    return "(まだ何も入力されていません)";
  }
  return [
    `【分野ポリシー: ${values.name?.trim() || "(無名のテンプレート)"}】`,
    ...lines,
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
      instruction_json: {
        goal: template?.instruction_json.goal ?? "",
        priorities: template?.instruction_json.priorities ?? [""],
        avoid: template?.instruction_json.avoid ?? [],
        preferred_card_types:
          template?.instruction_json.preferred_card_types ?? ["basic_qa"],
        answer_style: template?.instruction_json.answer_style ?? "",
        difficulty_policy: template?.instruction_json.difficulty_policy ?? "",
        note_interpretation_policy:
          template?.instruction_json.note_interpretation_policy ?? "",
      },
    },
  });

  const watchedValues = useWatch({ control });
  const previewText = buildPolicyPreview(
    watchedValues as CreateDomainTemplateInput
  );

  const onSubmit = handleSubmit(async (values) => {
    const cleaned = {
      ...values,
      instruction_json: {
        ...values.instruction_json,
        priorities: values.instruction_json.priorities.filter(
          (v) => v.trim() !== ""
        ),
        avoid: values.instruction_json.avoid?.filter((v) => v.trim() !== ""),
      },
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(cleaned);
        toast.success("テンプレートを更新しました");
      } else {
        await createMutation.mutateAsync(cleaned);
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
      {/* 概要説明: テンプレートが何のためにあるか */}
      <div className="rounded-xl bg-primary/5 border-l-4 border-primary p-4 space-y-1">
        <p className="text-sm font-medium flex items-center gap-2 text-primary">
          <Sparkles className="size-4" aria-hidden />
          テンプレートの仕組み
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          ここで設定した値は、AI 候補生成時のプロンプトに「分野ポリシー」として
          組み込まれます。下にある<strong>プロンプトプレビュー</strong>で、
          実際に AI に渡される指示文を確認できます。
        </p>
      </div>

      {/* 基本情報 */}
      <section aria-labelledby="basic-info" className="space-y-4">
        <h2
          id="basic-info"
          className="text-sm font-semibold flex items-center gap-2 text-muted-foreground"
        >
          <Type className="size-4" aria-hidden />
          基本情報
        </h2>

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
          </label>
          <textarea
            id="description"
            rows={2}
            {...register("description")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
            placeholder="このテンプレートが何のためのものか自分用にメモ"
          />
        </div>
      </section>

      {/* 策問の方向性 */}
      <section
        aria-labelledby="direction"
        className="space-y-4 rounded-xl bg-card border p-4 md:p-5"
      >
        <h2
          id="direction"
          className="text-sm font-semibold flex items-center gap-2"
        >
          <Target className="size-4 text-primary" aria-hidden />
          策問の方向性
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (どんなカードを作ってほしいか)
          </span>
        </h2>

        <div className="space-y-1.5">
          <label htmlFor="goal" className="text-sm font-medium">
            学習目的 <span className="text-destructive">*</span>
          </label>
          <textarea
            id="goal"
            rows={2}
            {...register("instruction_json.goal")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
            aria-invalid={!!errors.instruction_json?.goal}
            placeholder="例: Web開発の基礎概念を定着させる"
          />
          <FieldHint>
            「目的: ◯◯◯」としてプロンプト先頭に挿入。AI のカード方向性を決める軸。
          </FieldHint>
          {errors.instruction_json?.goal && (
            <p role="alert" className="text-xs text-destructive">
              {errors.instruction_json.goal.message}
            </p>
          )}
        </div>

        <Controller
          name="instruction_json.priorities"
          control={control}
          render={({ field, fieldState }) => (
            <StringListField
              label="優先観点"
              values={field.value ?? [""]}
              onChange={field.onChange}
              placeholder="例: 定義を短く問う"
              description="AI が候補を選ぶ時に優先する切り口。「優先観点: ◯ / ◯ / ◯」としてプロンプトに渡る"
              required
              error={fieldState.error?.message}
            />
          )}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">好むカード種別</legend>
          <p className="text-xs text-muted-foreground">
            AI が生成する候補のカード種別をここから選びます (複数可)
          </p>
          <Controller
            name="instruction_json.preferred_card_types"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {CARD_TYPES.map((type) => {
                  const checked = field.value?.includes(type) ?? false;
                  return (
                    <label
                      key={type}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 min-h-11 cursor-pointer transition-colors ${
                        checked
                          ? "border-2 border-primary bg-primary/10 text-primary font-medium"
                          : "border hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...(field.value ?? []), type]
                            : (field.value ?? []).filter((t) => t !== type);
                          field.onChange(next);
                        }}
                        className="sr-only"
                      />
                      <span className="text-sm">{CARD_TYPE_LABELS[type]}</span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </fieldset>
      </section>

      {/* 制約とスタイル */}
      <section
        aria-labelledby="constraints"
        className="space-y-4 rounded-xl bg-card border p-4 md:p-5"
      >
        <h2
          id="constraints"
          className="text-sm font-semibold flex items-center gap-2"
        >
          <FlaskConical
            className="size-4 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          制約とスタイル
          <span className="text-xs font-normal text-muted-foreground ml-1">
            (避けたいパターンや書き方)
          </span>
        </h2>

        <Controller
          name="instruction_json.avoid"
          control={control}
          render={({ field }) => (
            <StringListField
              label="避けたい問い方"
              values={field.value ?? []}
              onChange={field.onChange}
              placeholder="例: 長文回答を求める問い"
              description="「避けたい問い方: ◯ / ◯」としてプロンプトに渡り、AI に避けてもらうパターン"
            />
          )}
        />

        <div className="space-y-1.5">
          <label htmlFor="answer_style" className="text-sm font-medium">
            回答スタイル
          </label>
          <input
            id="answer_style"
            type="text"
            {...register("instruction_json.answer_style")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
            placeholder="例: 1-2文で簡潔に"
          />
          <FieldHint>
            「回答スタイル: ◯◯◯」として AI に渡る。answer の長さや言い回しを制御。
          </FieldHint>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="difficulty_policy" className="text-sm font-medium">
            難易度方針
          </label>
          <input
            id="difficulty_policy"
            type="text"
            {...register("instruction_json.difficulty_policy")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
            placeholder="例: 初学者向け"
          />
          <FieldHint>
            「難易度方針: ◯◯◯」として AI に渡る。問いと答えの抽象度を調整。
          </FieldHint>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="note_interpretation_policy"
            className="text-sm font-medium"
          >
            メモの解釈方針
          </label>
          <textarea
            id="note_interpretation_policy"
            rows={2}
            {...register("instruction_json.note_interpretation_policy")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm resize-y"
            placeholder="例: メモにない内容を過剰に補完しない"
          />
          <FieldHint>
            「メモ解釈方針: ◯◯◯」として AI に渡る。メモ本文の読み方を制御
            (補完するか、忠実にするかなど)。
          </FieldHint>
        </div>
      </section>

      {/* プロンプトプレビュー: 入力中の値で AI に渡される実テキストを表示 */}
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
          このブロックがメモ本文と一緒に AI に送られます。空欄のフィールドは省略されます。
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
