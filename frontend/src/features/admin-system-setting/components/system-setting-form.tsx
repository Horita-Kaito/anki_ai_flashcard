"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import {
  useSystemSetting,
  useUpdateSystemSetting,
} from "../api/system-setting-queries";
import {
  formInputToApiInput,
  updateSystemSettingFormSchema,
  type UpdateSystemSettingFormInput,
} from "../schemas/system-setting-schemas";
import { Button } from "@/shared/ui/button";

export function SystemSettingForm() {
  const { data: setting, isLoading, isError, refetch } = useSystemSetting();
  const updateMutation = useUpdateSystemSetting();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateSystemSettingFormInput>({
    resolver: zodResolver(updateSystemSettingFormSchema),
    defaultValues: { monthly_token_limit: "" },
  });

  // 初回データ取得時にフォームの初期値をセットする (rhf 標準パターン)
  useEffect(() => {
    if (setting) {
      reset({
        monthly_token_limit:
          setting.monthly_token_limit === null
            ? ""
            : String(setting.monthly_token_limit),
      });
    }
  }, [setting, reset]);

  if (isError) {
    return (
      <div
        role="alert"
        className="space-y-3 border border-red-300 bg-red-50 dark:bg-red-950/30 rounded-xl p-4"
      >
        <p className="text-sm text-red-700 dark:text-red-300">
          設定の読み込みに失敗しました。
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          onClick={() => refetch()}
        >
          再試行
        </Button>
      </div>
    );
  }

  if (isLoading || !setting) {
    return (
      <p
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        読み込み中...
      </p>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync(formInputToApiInput(values));
      toast.success("システム設定を保存しました");
    } catch (err: unknown) {
      toast.error(resolveErrorMessage(err));
    }
  });

  const currentValue = setting.monthly_token_limit;
  const errorMessage = errors.monthly_token_limit?.message;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6"
      aria-label="システム設定フォーム"
      noValidate
    >
      <section className="space-y-4 border rounded-xl p-4 md:p-5">
        <header className="space-y-1">
          <h2 className="font-medium">AI 利用上限</h2>
          <p className="text-xs text-muted-foreground">
            全ユーザー共通の月次トークン使用量上限です。input + output の合計で
            判定し、超過するとそのユーザーは月末までカード生成が 429 で弾かれます。
          </p>
        </header>

        <div className="space-y-1.5">
          <label
            htmlFor="monthly_token_limit"
            className="text-sm font-medium"
          >
            月次トークン上限 (空欄で無制限)
          </label>
          <input
            id="monthly_token_limit"
            type="text"
            inputMode="numeric"
            placeholder="例: 500000"
            {...register("monthly_token_limit")}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-invalid={!!errorMessage}
            aria-describedby={
              errorMessage
                ? "monthly_token_limit-error"
                : "monthly_token_limit-help"
            }
          />
          {errorMessage ? (
            <p
              id="monthly_token_limit-error"
              role="alert"
              className="text-xs text-red-600"
            >
              {errorMessage}
            </p>
          ) : (
            <p
              id="monthly_token_limit-help"
              className="text-xs text-muted-foreground"
            >
              現在:{" "}
              {currentValue === null
                ? "無制限"
                : `${currentValue.toLocaleString()} tokens / 月`}
            </p>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          className="min-h-11"
          disabled={!isDirty || isSubmitting || updateMutation.isPending}
        >
          {isSubmitting || updateMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}

function resolveErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "保存に失敗しました";
  const status = error.response?.status;
  if (status === 403) return "管理者権限がありません";
  if (status === 422) {
    const data = error.response?.data as
      | { errors?: Record<string, string[]>; message?: string }
      | undefined;
    const firstError = data?.errors
      ? Object.values(data.errors)[0]?.[0]
      : undefined;
    return firstError ?? data?.message ?? "入力内容を確認してください";
  }
  if (status === 429) return "短時間に保存しすぎです。少し待ってから再度試してください";
  return "保存に失敗しました";
}
