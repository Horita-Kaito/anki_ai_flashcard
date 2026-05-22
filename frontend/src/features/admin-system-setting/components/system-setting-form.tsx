"use client";

import { useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import {
  useSystemSetting,
  useUpdateSystemSetting,
} from "../api/system-setting-queries";
import { Button } from "@/shared/ui/button";

export function SystemSettingForm() {
  const { data: setting, isLoading } = useSystemSetting();
  const updateMutation = useUpdateSystemSetting();

  // null は「無制限 (空欄)」を表す。string で持って submit 時に parse する
  // (number 入力で null と 0 を厳密に区別したいため、生の文字列を一旦経由する)。
  // ユーザーが触る前は data から派生表示し、触った後は override 値を使う。
  const [rawOverride, setRawOverride] = useState<string | null>(null);

  if (isLoading || !setting) {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        読み込み中...
      </p>
    );
  }

  const initialRaw =
    setting.monthly_token_limit === null
      ? ""
      : String(setting.monthly_token_limit);
  const raw = rawOverride ?? initialRaw;
  const setRaw = (v: string) => setRawOverride(v);

  const trimmed = raw.trim();
  let parsed: number | null = null;
  let parseError: string | null = null;
  if (trimmed === "") {
    parsed = null;
  } else if (!/^\d+$/.test(trimmed)) {
    parseError = "整数で入力してください";
  } else {
    const n = Number(trimmed);
    if (n < 1000) {
      parseError = "1000 以上を指定してください (無制限にするには空欄)";
    } else if (n > 1_000_000_000) {
      parseError = "値が大きすぎます (10 億以下)";
    } else {
      parsed = n;
    }
  }

  const currentValue = setting.monthly_token_limit;
  const isDirty = parsed !== currentValue;
  const canSubmit = !parseError && isDirty && !updateMutation.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await updateMutation.mutateAsync({ monthly_token_limit: parsed });
      toast.success("システム設定を保存しました");
    } catch (err: unknown) {
      toast.error(resolveErrorMessage(err));
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6"
      aria-label="システム設定フォーム"
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
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-invalid={!!parseError}
            aria-describedby={
              parseError ? "monthly_token_limit-error" : "monthly_token_limit-help"
            }
          />
          {parseError ? (
            <p id="monthly_token_limit-error" className="text-xs text-red-600">
              {parseError}
            </p>
          ) : (
            <p
              id="monthly_token_limit-help"
              className="text-xs text-muted-foreground"
            >
              現在: {currentValue === null
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
          disabled={!canSubmit}
        >
          {updateMutation.isPending ? "保存中..." : "保存"}
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
  return "保存に失敗しました";
}
