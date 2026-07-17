import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

/**
 * ランディング上部の最小ヘッダー。ブランド・テーマ切替・ログイン導線のみ。
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          aria-label="Tessera ホーム"
          className="flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="bookplate-mark inline-flex size-8 items-center justify-center rounded-sm font-serif text-base font-semibold">
            ま
          </span>
          <span className="text-sm font-semibold">Tessera</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/login"
            className={`${buttonVariants({ size: "sm" })} min-h-11 px-4`}
          >
            ログイン
          </Link>
        </div>
      </div>
    </header>
  );
}
