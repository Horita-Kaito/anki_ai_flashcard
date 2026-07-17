import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";

/**
 * ランディングのファーストビュー。
 * 「要約するアプリ」ではなく「記憶に定着させるアプリ」であることを伝える。
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,var(--forest-faint),transparent)]"
      />
      <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-16 md:px-8 md:pb-24 md:pt-28">
        <div className="flex flex-col items-center space-y-6 text-center md:space-y-8">
          <Badge variant="success" className="px-3 py-1">
            <Sparkles className="size-3" aria-hidden />
            Tessera · 学習を記憶に変える
          </Badge>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            読んだだけで、
            <br />
            終わらせない。
          </h1>

          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            メモを書けば AI が問いの候補を用意します。採用するのはあなた。
            選んだカードだけが、忘れる前の復習になって返ってきます。
          </p>

          <div className="flex w-full max-w-sm flex-col gap-3 pt-2 sm:w-auto sm:max-w-none sm:flex-row">
            <Link
              href="/login"
              className={`${buttonVariants({ size: "lg" })} min-h-12 justify-center px-6 text-base shadow-sm`}
            >
              はじめる
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#flow"
              className={`${buttonVariants({ variant: "outline", size: "lg" })} min-h-12 justify-center px-6 text-base`}
            >
              使い方を見る
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
