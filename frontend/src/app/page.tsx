import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";
import {
  LandingHeader,
  LandingHero,
  LandingFlow,
  LandingTrust,
  LandingPersonas,
} from "@/widgets/landing";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Tessera",
  description:
    "学習メモを AI が問いの候補に変換。採用するのはあなた。選んだカードだけを間隔反復で記憶に定着させる学習アプリ。",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />

      <main className="flex-1">
        <LandingHero />
        <LandingFlow />
        <LandingTrust />
        <LandingPersonas />

        {/* 最終 CTA */}
        <section className="mx-auto max-w-5xl px-4 py-14 md:px-8 md:py-20">
          <div className="flex flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center md:p-12">
            <h2 className="text-2xl font-bold md:text-3xl">
              今日の学びを、明日の記憶に。
            </h2>
            <p className="max-w-md text-sm text-muted-foreground md:text-base">
              まずは 1 枚のメモから。書いたその場で、覚える準備が整います。
            </p>
            <Link
              href="/login"
              className={`${buttonVariants({ size: "lg" })} min-h-12 justify-center px-8 text-base shadow-sm`}
            >
              はじめる
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl border-t px-4 py-8 text-center text-xs text-muted-foreground md:px-8 md:py-12">
        <p>© {new Date().getFullYear()} Tessera · 学習を記憶に変える作業台</p>
      </footer>
    </div>
  );
}
