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
    defaultValues: { name: "", email: "" },
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
      aria-label="ユーザー新規作成フォーム"
    >
      {errorMessage && (
        <div
          role="alert"
          className="text-sm text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300 p-3 rounded-md"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          ユーザー名
        </label>
        <input
          id="name"
          type="text"
          autoComplete="off"
          {...register("name")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="off"
          {...register("email")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-600">
            {errors.email.message}
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
