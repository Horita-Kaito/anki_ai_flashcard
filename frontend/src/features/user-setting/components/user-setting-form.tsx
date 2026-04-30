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
  { value: "google", label: "Google" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
] as const;

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (推奨・低コスト)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (高精度)" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o mini (低コスト)" },
    { value: "gpt-4o", label: "GPT-4o (高精度)" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ],
  anthropic: [
    { value: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku (低コスト)" },
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (高精度)" },
  ],
};

export function UserSettingForm() {
  const { data: setting, isLoading } = useUserSetting();
  const { data: templates } = useDomainTemplateList();
  const updateMutation = useUpdateUserSetting();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateUserSettingInput>({
    resolver: zodResolver(updateUserSettingSchema),
    defaultValues: {},
  });

  const selectedProvider = watch("default_ai_provider");

  useEffect(() => {
    if (setting) {
      reset({
        default_domain_template_id: setting.default_domain_template_id,
        default_ai_provider: setting.default_ai_provider,
        default_ai_model: setting.default_ai_model,
        default_generation_count: setting.default_generation_count,
        desired_retention: setting.desired_retention,
      });
    }
  }, [setting, reset]);

  const desiredRetention = watch("desired_retention");

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
            {...register("default_ai_provider", {
              onChange: (e) => {
                const provider = e.target.value;
                const models = AI_MODELS[provider];
                if (models?.[0]) {
                  setValue("default_ai_model", models[0].value, { shouldDirty: true });
                }
              },
            })}
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
          <select
            id="default_ai_model"
            {...register("default_ai_model")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
          >
            {(AI_MODELS[selectedProvider ?? "google"] ?? []).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
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

      <section className="space-y-4 border rounded-xl p-4 md:p-5">
        <h2 className="font-medium">復習アルゴリズム (FSRS)</h2>
        <p className="text-xs text-muted-foreground">
          FSRS で復習するカードのみに影響します (SM-2 のカードは別ロジック)。
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="desired_retention" className="text-sm font-medium">
              目標想起率
            </label>
            <span className="text-sm font-mono tabular-nums">
              {desiredRetention !== undefined
                ? `${(desiredRetention * 100).toFixed(0)}%`
                : "—"}
            </span>
          </div>
          <input
            id="desired_retention"
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            {...register("desired_retention", { valueAsNumber: true })}
            className="w-full accent-primary"
          />
          <p className="text-xs text-muted-foreground">
            高いほど忘れにくくなりますが、復習頻度が増えます。デフォルトは 90%。
          </p>
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
