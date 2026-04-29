"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import { useLogin } from "../api/auth-queries";
import { loginSchema, type LoginInput } from "../schemas/auth-schemas";
import { fetchOnboardingStatus } from "@/entities/user/api/endpoints";
import { Button } from "@/shared/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);

      // next パラメータがあればそちらへ遷移
      const next = searchParams.get("next");
      if (next) {
        router.push(next);
        return;
      }

      // オンボーディング未完了ならオンボーディングへ
      try {
        const status = await fetchOnboardingStatus();
        router.push(status.completed ? "/dashboard" : "/onboarding");
      } catch {
        // ステータス取得に失敗してもダッシュボードへ (ダッシュボード側で再チェック)
        router.push("/dashboard");
      }
    } catch {
      // エラー表示は下部の login.error で行う
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {login.isError && (
        <div
          role="alert"
          className="text-sm text-red-600 bg-red-50 p-3 rounded-md"
        >
          {isAxiosError(login.error) && login.error.response?.data?.message
            ? login.error.response.data.message
            : "認証に失敗しました。メールアドレスとパスワードを確認してください。"}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full min-h-11"
        disabled={isSubmitting}
      >
        {isSubmitting ? "ログイン中..." : "ログイン"}
      </Button>
    </form>
  );
}
