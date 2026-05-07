"use client";

import { useState } from "react";
import { Check, Copy, AlertTriangle } from "lucide-react";
import type { AdminCreatedUserResponse } from "../schemas/admin-user-schemas";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface UserCreationResultProps {
  result: AdminCreatedUserResponse;
  onReset: () => void;
}

export function UserCreationResult({ result, onReset }: UserCreationResultProps) {
  return (
    <div
      className="space-y-5 border rounded-xl p-4 md:p-6 bg-card"
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-2 items-start text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-md p-3">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" aria-hidden />
        <p>
          <strong className="font-medium">パスワードはこの画面でしか表示されません。</strong>
          {" "}
          閉じる前に必ず本人へ共有してください。
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">作成したユーザー</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">名前</dt>
          <dd className="font-medium break-all">{result.user.name}</dd>
          <dt className="text-muted-foreground">メール</dt>
          <dd className="font-medium break-all">{result.user.email}</dd>
        </dl>
      </div>

      <div className="space-y-1.5">
        <CopyableField label="メールアドレス" value={result.user.email} />
        <CopyableField
          label="初期パスワード"
          value={result.generated_password}
          isMono
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full min-h-11"
        onClick={onReset}
      >
        別のユーザーを作成する
      </Button>
    </div>
  );
}

interface CopyableFieldProps {
  label: string;
  value: string;
  isMono?: boolean;
}

function CopyableField({ label, value, isMono }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード書き込み拒否時は何もしない
    }
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-xs font-medium text-muted-foreground sm:w-32 sm:shrink-0">
        {label}
      </span>
      <div className="flex flex-1 items-stretch gap-2">
        <code
          className={cn(
            "flex-1 rounded-md bg-muted px-3 py-2.5 text-sm break-all min-h-11 flex items-center",
            isMono && "font-mono tracking-tight"
          )}
        >
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="shrink-0"
          onClick={handleCopy}
          aria-label={`${label}をコピー`}
        >
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </Button>
      </div>
    </div>
  );
}
