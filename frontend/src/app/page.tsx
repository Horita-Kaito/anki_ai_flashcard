import Link from "next/link";
import {
  Sparkles,
  GraduationCap,
  LineChart,
  KeyboardIcon,
  Smartphone,
} from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "まなメモAI",
  description:
    "学習メモを、今日覚えるべき問いに変える作業台。",
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
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ヒーロー */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 md:px-8 pt-16 md:pt-28 pb-12 md:pb-20">
          <div className="flex flex-col items-center text-center space-y-6 md:space-y-8">
            <span className="bookplate-mark inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs">
              <Sparkles className="size-3 text-primary" aria-hidden />
              まなメモAI
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              学習メモを、
              <br />
              今日覚えるべき問いへ。
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl">
              AI が候補を出し、人がレビューして採用します。読んだだけで終わらせず、明日の復習に残します。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:w-auto sm:max-w-none pt-2">
              <Link
                href="/login"
                className={`${buttonVariants({ size: "lg" })} min-h-12 px-6 justify-center text-base shadow-sm`}
              >
                作業台を開く
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* フィーチャー */}
      <section className="mx-auto max-w-5xl px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Feature
            icon={<Sparkles className="size-5" aria-hidden />}
            title="メモを問いに変える"
            description="AI は候補を出すだけです。採用・編集・却下は人が判断し、復習対象を整えます。"
          />
          <Feature
            icon={<GraduationCap className="size-5" aria-hidden />}
            title="今日の復習に戻す"
            description="Again / Hard / Good / Easy の評価で、次に出会う日を決めます。"
          />
          <Feature
            icon={<LineChart className="size-5" aria-hidden />}
            title="整理を主役にしない"
            description="検索と期日を中心に、今やるカードへすぐ戻れるようにします。"
          />
        </div>
      </section>

      {/* モバイル/PC 両対応 */}
      <section className="mx-auto max-w-5xl px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-lg border bg-card p-6 md:p-8 space-y-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="size-5" aria-hidden />
            </span>
            <h3 className="text-lg font-semibold">モバイルに最適化</h3>
            <p className="text-sm text-muted-foreground">
              メモ入力中も保存導線を下部に固定します。復習では余計な導線を消し、評価だけを残します。
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 md:p-8 space-y-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyboardIcon className="size-5" aria-hidden />
            </span>
            <h3 className="text-lg font-semibold">PC はキーボード駆動</h3>
            <p className="text-sm text-muted-foreground">
              <kbd className="px-1.5 py-0.5 border rounded bg-muted text-xs">⌘K</kbd>
              {" "}でコマンドパレット、
              <kbd className="px-1.5 py-0.5 border rounded bg-muted text-xs">?</kbd>
              {" "}でショートカット一覧。復習は
              <kbd className="px-1.5 py-0.5 border rounded bg-muted text-xs">1</kbd>
              〜
              <kbd className="px-1.5 py-0.5 border rounded bg-muted text-xs">4</kbd>
              {" "}で即評価。
            </p>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="mx-auto max-w-5xl px-4 md:px-8 py-8 md:py-12 text-xs text-muted-foreground text-center border-t">
        <p>© {new Date().getFullYear()} まなメモAI · 個人学習支援ツール</p>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow">
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
