"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/button";

/**
 * ルート単位のエラー境界 (App Router)。
 * Server Component / データ取得層を含む予期しないレンダリングエラーを受け止め、
 * `reset()` によるセグメント単位の再試行を提供する。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 調査用にコンソールへ出力 (本番では監視ツール連携を想定)
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">問題が発生しました</h1>
        <p className="text-sm text-muted-foreground">
          一時的なエラーの可能性があります。再試行しても解決しない場合は、
          時間をおいてもう一度お試しください。
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            エラーコード: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="lg" className="min-h-11" onClick={reset}>
          再試行
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          ホームへ戻る
        </Button>
      </div>
    </main>
  );
}
