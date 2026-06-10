"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import type { IssuedApiToken } from "@/entities/api-token/types";
import { useIssueApiToken } from "../api/api-token-queries";
import {
  issueTokenSchema,
  type IssueTokenInput,
} from "../schemas/api-token-schemas";

const SCOPE_OPTIONS = [
  {
    value: "mcp",
    label: "MCP 専用",
    description: "Claude などの MCP クライアント接続のみ。REST API は不可",
  },
  {
    value: "full",
    label: "フルアクセス",
    description: "すべての API を利用可能 (CLI・自作スクリプト向け)",
  },
] as const;

/**
 * API トークン発行フォーム。
 * 発行後はプレーンテキストを一度だけ表示する (再表示不可)。
 */
export function TokenCreateForm() {
  const [issued, setIssued] = useState<IssuedApiToken | null>(null);
  const issueMutation = useIssueApiToken();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueTokenInput>({
    resolver: zodResolver(issueTokenSchema),
    defaultValues: { device_name: "", scope: "mcp" },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      const token = await issueMutation.mutateAsync(input);
      setIssued(token);
      reset();
      toast.success("トークンを発行しました");
    } catch {
      toast.error("トークンの発行に失敗しました");
    }
  });

  const copyToken = async () => {
    if (!issued) return;
    await navigator.clipboard.writeText(issued.token);
    toast.success("コピーしました");
  };

  if (issued) {
    return (
      <div className="space-y-3 border rounded-xl p-4 md:p-5 bg-muted/30">
        <h3 className="font-medium">トークンを発行しました</h3>
        <p className="text-sm text-muted-foreground">
          このトークンは今回しか表示されません。安全な場所に保存してください。
        </p>
        <code
          className="block w-full break-all rounded-md border bg-background px-3 py-2 text-sm"
          data-testid="issued-token"
        >
          {issued.token}
        </code>
        <div className="flex gap-2">
          <Button type="button" onClick={copyToken}>
            コピー
          </Button>
          <Button type="button" variant="outline" onClick={() => setIssued(null)}>
            閉じる
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 border rounded-xl p-4 md:p-5"
      aria-label="トークン発行フォーム"
    >
      <div className="space-y-1.5">
        <label htmlFor="token-device-name" className="text-sm font-medium">
          トークン名
        </label>
        <input
          id="token-device-name"
          type="text"
          placeholder="例: claude-mcp"
          {...register("device_name")}
          className="w-full border rounded-md px-3 py-2.5 text-base md:text-sm min-h-11 bg-background"
        />
        {errors.device_name && (
          <p role="alert" className="text-sm text-destructive">
            {errors.device_name.message}
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">権限スコープ</legend>
        {SCOPE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 border rounded-md px-3 py-2.5 cursor-pointer has-[:checked]:border-primary"
          >
            <input
              type="radio"
              value={option.value}
              {...register("scope")}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "発行中..." : "トークンを発行"}
      </Button>
    </form>
  );
}
