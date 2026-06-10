"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import type { ApiToken } from "@/entities/api-token/types";
import { useApiTokenList, useRevokeApiToken } from "../api/api-token-queries";

function scopeLabel(abilities: string[]): string {
  return abilities.includes("*") ? "フルアクセス" : "MCP 専用";
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ja-JP");
}

/**
 * 発行済み API トークンの一覧と失効。
 */
export function TokenList() {
  const { data: tokens, isLoading } = useApiTokenList();
  const revokeMutation = useRevokeApiToken();
  const [revokeTarget, setRevokeTarget] = useState<ApiToken | null>(null);

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeMutation.mutateAsync(revokeTarget.id);
      toast.success("トークンを失効しました");
    } catch {
      toast.error("失効に失敗しました");
    } finally {
      setRevokeTarget(null);
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  if (!tokens || tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground border rounded-xl p-4">
        発行済みのトークンはありません。
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y border rounded-xl" aria-label="APIトークン一覧">
        {tokens.map((token) => (
          <li
            key={token.id}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{token.name}</p>
              <p className="text-xs text-muted-foreground">
                <span className="inline-block border rounded-full px-2 py-0.5 mr-2">
                  {scopeLabel(token.abilities)}
                </span>
                作成: {formatDate(token.created_at)} / 最終使用:{" "}
                {formatDate(token.last_used_at)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRevokeTarget(token)}
            >
              失効
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={revokeTarget !== null}
        title="トークンを失効しますか?"
        description={
          revokeTarget
            ? `「${revokeTarget.name}」を使用しているクライアントは接続できなくなります。`
            : undefined
        }
        confirmLabel="失効する"
        variant="destructive"
        loading={revokeMutation.isPending}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </>
  );
}
