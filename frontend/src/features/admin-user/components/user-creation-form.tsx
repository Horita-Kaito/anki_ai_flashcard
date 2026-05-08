"use client";

import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useCreateAdminUser } from "../api/admin-user-queries";
import {
  createAdminUserSchema,
  type AdminCreatedUserResponse,
} from "../schemas/admin-user-schemas";
import { Button } from "@/shared/ui/button";

interface UserCreationFormProps {
  onSuccess: (result: AdminCreatedUserResponse) => void;
}

interface FieldErrors {
  displayName?: string;
  contactEmail?: string;
}

export function UserCreationForm({ onSuccess }: UserCreationFormProps) {
  const createUser = useCreateAdminUser();
  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    // Chrome / PWM が DOM input.value を上書きするケースに備え、
    // 検証/送信は DOM ではなく React state を信頼する。
    const parsed = createAdminUserSchema.safeParse({ displayName, contactEmail });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        displayName: fieldErrors.displayName?.[0],
        contactEmail: fieldErrors.contactEmail?.[0],
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createUser.mutateAsync(parsed.data);
      setDisplayName("");
      setContactEmail("");
      onSuccess(result);
    } catch {
      // エラー表示は createUser.error から resolveErrorMessage で
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = resolveErrorMessage(createUser.error);

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
      autoComplete="off"
      aria-label="ユーザー新規作成フォーム"
    >
      {/* PWM / Chrome native autofill のデコイ (画面外) */}
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
          name="displayName"
          type="text"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-invalid={!!errors.displayName}
          aria-describedby={
            errors.displayName ? "admin-user-name-error" : undefined
          }
          suppressHydrationWarning
        />
        {errors.displayName && (
          <p id="admin-user-name-error" className="text-xs text-red-600">
            {errors.displayName}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="admin-user-email" className="text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="admin-user-email"
          name="contactEmail"
          type="text"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-invalid={!!errors.contactEmail}
          aria-describedby={
            errors.contactEmail ? "admin-user-email-error" : undefined
          }
          suppressHydrationWarning
        />
        {errors.contactEmail && (
          <p id="admin-user-email-error" className="text-xs text-red-600">
            {errors.contactEmail}
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
  if (status === 429)
    return "短時間に作成しすぎです。少し待ってから再度試してください";
  return error.response?.data?.message ?? "ユーザー作成に失敗しました";
}
