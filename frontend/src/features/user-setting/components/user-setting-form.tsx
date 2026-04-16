"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect } from "react";
import {
  useUpdateUserSetting,
  useUserSetting,
} from "../api/user-setting-queries";
import {
  updateUserSettingSchema,
  type UpdateUserSettingInput,
} from "../schemas/user-setting-schemas";
import { useDomainTemplateList } from "@/entities/domain-template/api/domain-template-queries";
import { Button } from "@/shared/ui/button";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
] as const;

export function UserSettingForm() {
  const { data: setting, isLoading } = useUserSetting();
  const { data: templates } = useDomainTemplateList();
  const updateMutation = useUpdateUserSetting();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateUserSettingInput>({
    resolver: zodResolver(updateUserSettingSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (setting) {
      reset({
        default_domain_template_id: setting.default_domain_template_id,
        daily_new_limit: setting.daily_new_limit,
        daily_review_limit: setting.daily_review_limit,
        default_ai_provider: setting.default_ai_provider,
        default_ai_model: setting.default_ai_model,
        default_generation_count: setting.default_generation_count,
      });
    }
  }, [setting, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(values);
      toast.success("設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
  });

  if (isLoading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-label="設定フォーム">
      <section className="space-y-4 border rounded-xl p-4 md:p-5">
        <h2 className="font-medium">学習設定</h2>

        <div className="space-y-1.5">
          <label htmlFor="daily_new_limit" className="text-sm font-medium">
            1日の新規カード上限
          </label>
          <input
            id="daily_new_limit"
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            {...register("daily_new_limit", { valueAsNumber: true })}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
            aria-invalid={!!errors.daily_new_limit}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="daily_review_limit" className="text-sm font-medium">
            1日の復習上限
          </label>
          <input
            id="daily_review_limit"
            type="number"
            inputMode="numeric"
            min={0}
            max={2000}
            {...register("daily_review_limit", { valueAsNumber: true })}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
            aria-invalid={!!errors.daily_review_limit}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="default_domain_template_id"
            className="text-sm font-medium"
          >
            既定の分野テンプレート
          </label>
          <select
            id="default_domain_template_id"
            {...register("default_domain_template_id", {
              setValueAs: (v) =>
                v === "" || v == null ? null : Number(v),
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
      </section>

      <section className="space-y-4 border rounded-xl p-4 md:p-5">
        <h2 className="font-medium">AI 設定</h2>

        <div className="space-y-1.5">
          <label htmlFor="default_ai_provider" className="text-sm font-medium">
            既定のプロバイダ
          </label>
          <select
            id="default_ai_provider"
            {...register("default_ai_provider")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="default_ai_model" className="text-sm font-medium">
            既定のモデル
          </label>
          <input
            id="default_ai_model"
            type="text"
            {...register("default_ai_model")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="default_generation_count"
            className="text-sm font-medium"
          >
            既定の候補生成数 (1回の AI 生成で作るカード数)
          </label>
          <input
            id="default_generation_count"
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            {...register("default_generation_count", { valueAsNumber: true })}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
            aria-invalid={!!errors.default_generation_count}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          className="min-h-11"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
