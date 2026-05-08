"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { useCreateAdminUser } from "../api/admin-user-queries";
import {
  createAdminUserSchema,
  type AdminCreatedUserResponse,
  type CreateAdminUserInput,
} from "../schemas/admin-user-schemas";
import { Button } from "@/shared/ui/button";

interface UserCreationFormProps {
  onSuccess: (result: AdminCreatedUserResponse) => void;
}

export function UserCreationForm({ onSuccess }: UserCreationFormProps) {
  const createUser = useCreateAdminUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAdminUserInput>({
    resolver: zodResolver(createAdminUserSchema),
    defaultValues: { displayName: "", contactEmail: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await createUser.mutateAsync(values);
      reset();
      onSuccess(result);
    } catch {
      // エラー表示は下部の createUser.error で行う
    }
  });

  const errorMessage = resolveErrorMessage(createUser.error);

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
      autoComplete="off"
      aria-label="ユーザー新規作成フォーム"
    >
      {/*
        パスワードマネージャ (Chrome / 1Password / LastPass 等) は
        フォーム内に最初に登場する text + password input を「ログイン」と認識して
        オートフィルを試みる。実フィールドへの誤入力を防ぐため、
        画面外に隠したデコイ input を最前に置いて PWM の認識をそちらへ吸収させる。
        suppressHydrationWarning は PWM が hydrate 直後に value を書き換えても
        エラーが出ないようにする保険。
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <input
          type="text"
          name="username"
          tabIndex={-1}
          autoComplete="username"
          defaultValue=""
          suppressHydrationWarning
        />
        <input
          type="password"
          name="password"
          tabIndex={-1}
          autoComplete="new-password"
          defaultValue=""
          suppressHydrationWarning
        />
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 p-3 rounded-md"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="admin-user-name" className="text-sm font-medium">
          ユーザー名
        </label>
        <input
          id="admin-user-name"
          type="text"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          {...register("displayName")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-invalid={!!errors.displayName}
          aria-describedby={
            errors.displayName ? "admin-user-name-error" : undefined
          }
        />
        {errors.displayName && (
          <p id="admin-user-name-error" className="text-xs text-red-600">
            {errors.displayName.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="admin-user-email" className="text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="admin-user-email"
          type="text"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          {...register("contactEmail")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-invalid={!!errors.contactEmail}
          aria-describedby={
            errors.contactEmail ? "admin-user-email-error" : undefined
          }
        />
        {errors.contactEmail && (
          <p id="admin-user-email-error" className="text-xs text-red-600">
            {errors.contactEmail.message}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        パスワードはランダム生成されます。作成完了画面で必ず控えてください。
      </p>

      <Button
        type="submit"
        size="lg"
        className="w-full min-h-11"
        disabled={isSubmitting}
      >
        {isSubmitting ? "作成中..." : "ユーザーを作成"}
      </Button>
    </form>
  );
}

function resolveErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (!isAxiosError(error)) return "ユーザー作成に失敗しました";
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
  if (status === 429) return "短時間に作成しすぎです。少し待ってから再度試してください";
  return error.response?.data?.message ?? "ユーザー作成に失敗しました";
}
