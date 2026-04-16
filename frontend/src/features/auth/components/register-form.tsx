"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { useRegister } from "../api/auth-queries";
import { registerSchema, type RegisterInput } from "../schemas/auth-schemas";
import { Button } from "@/shared/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerMutation.mutateAsync(values);
      router.push("/dashboard");
    } catch (err) {
      if (
        isAxiosError(err) &&
        err.response?.status === 422 &&
        err.response.data?.errors
      ) {
        const fieldErrors = err.response.data.errors as Record<string, string[]>;
        const validFields: (keyof RegisterInput)[] = [
          "name",
          "email",
          "password",
          "password_confirmation",
        ];
        for (const [field, messages] of Object.entries(fieldErrors)) {
          if (validFields.includes(field as keyof RegisterInput)) {
            setError(field as keyof RegisterInput, {
              type: "server",
              message: messages[0],
            });
          }
        }
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {registerMutation.isError && (
        <div
          role="alert"
          className="text-sm text-red-600 bg-red-50 p-3 rounded-md"
        >
          {isAxiosError(registerMutation.error) &&
          registerMutation.error.response?.data?.message
            ? registerMutation.error.response.data.message
            : "登録に失敗しました。入力内容を確認してください。"}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          名前
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          {...register("name")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

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
          パスワード (8文字以上)
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password_confirmation" className="text-sm font-medium">
          パスワード (確認)
        </label>
        <input
          id="password_confirmation"
          type="password"
          autoComplete="new-password"
          {...register("password_confirmation")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11"
          aria-invalid={!!errors.password_confirmation}
        />
        {errors.password_confirmation && (
          <p className="text-xs text-red-600">
            {errors.password_confirmation.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full min-h-11"
        disabled={isSubmitting}
      >
        {isSubmitting ? "登録中..." : "登録"}
      </Button>
    </form>
  );
}
