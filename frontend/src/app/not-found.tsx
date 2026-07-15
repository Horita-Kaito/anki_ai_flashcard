import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ページが見つかりません | Tessera",
};

/**
 * 存在しない URL への 404 ページ。
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">ページが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          URL が変更されたか、削除された可能性があります。
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ホームへ戻る
      </Link>
    </main>
  );
}
