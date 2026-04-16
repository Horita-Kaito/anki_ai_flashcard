"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
      <div className="space-y-4">
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
          />
        </div>
      </div>

      <div className="space-y-4 border rounded-xl p-4 md:p-5">
        <h2 className="font-medium">策問ポリシー</h2>

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
              description="AIに優先してほしい問いの切り口"
              required
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="instruction_json.avoid"
          control={control}
          render={({ field }) => (
            <StringListField
              label="避けたい問い方"
              values={field.value ?? []}
              onChange={field.onChange}
              placeholder="例: 長文回答を求める問い"
              description="AIに避けてほしいパターン"
            />
          )}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">好むカード種別</legend>
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
                      className="inline-flex items-center gap-2 border rounded-md px-3 py-2 min-h-11 cursor-pointer hover:bg-muted/50 transition-colors"
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
                        className="size-4"
                      />
                      <span className="text-sm">{CARD_TYPE_LABELS[type]}</span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </fieldset>

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
        </div>
      </div>

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
