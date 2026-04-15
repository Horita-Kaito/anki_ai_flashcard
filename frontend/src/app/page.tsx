import Link from "next/link";
import {
  Sparkles,
  GraduationCap,
  LineChart,
  KeyboardIcon,
  Smartphone,
} from "lucide-react";
import { buttonVariants } from "@/shared/ui/button";

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* ヒーロー */}
      <section className="relative overflow-hidden">
        {/* 背景: 微細なグラデーション */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, color-mix(in oklch, var(--primary), transparent 92%), transparent 70%)",
          }}
        />

        <div className="mx-auto max-w-5xl px-4 md:px-8 pt-16 md:pt-28 pb-12 md:pb-20">
          <div className="flex flex-col items-center text-center space-y-6 md:space-y-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card/70 backdrop-blur text-xs text-muted-foreground">
              <Sparkles className="size-3 text-primary" aria-hidden />
              AI × 間隔反復で「問いを作る面倒」をゼロに
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              メモを、
              <br className="sm:hidden" />
              <span className="text-gradient-primary">記憶に残る問い</span>
              へ。
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl">
              学習中の気づきを短いメモで残すだけ。AI が効果的なフラッシュカード候補に変換し、
              科学的な間隔反復であなたの記憶に定着させます。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:w-auto sm:max-w-none pt-2">
              <Link
                href="/register"
                className={`${buttonVariants({ size: "lg" })} min-h-12 px-6 justify-center text-base shadow-sm`}
              >
                無料で始める
              </Link>
              <Link
                href="/login"
                className={`${buttonVariants({ variant: "outline", size: "lg" })} min-h-12 px-6 justify-center text-base`}
              >
                ログイン
              </Link>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              クレジットカード不要 · 個人利用完全無料
            </p>
          </div>
        </div>
      </section>

      {/* フィーチャー */}
      <section className="mx-auto max-w-5xl px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Feature
            icon={<Sparkles className="size-5" aria-hidden />}
            title="AI が候補を生成"
            description="メモを書くだけ。OpenAI / Anthropic 等の LLM が分野テンプレートに沿って複数のカード候補を提案します。採用・編集・却下はあなたが判断。"
          />
          <Feature
            icon={<GraduationCap className="size-5" aria-hidden />}
            title="SM-2 間隔反復"
            description="Again / Hard / Good / Easy の自己評価で次回出題日を自動調整。無駄な復習を減らし、忘れる直前のタイミングで想起します。"
          />
          <Feature
            icon={<LineChart className="size-5" aria-hidden />}
            title="学習を可視化"
            description="ストリーク、Again 率、デッキ別パフォーマンス。データを味方に、継続のモチベーションを保ちます。"
          />
        </div>
      </section>

      {/* モバイル/PC 両対応 */}
      <section className="mx-auto max-w-5xl px-4 md:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-2xl border bg-card p-6 md:p-8 space-y-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Smartphone className="size-5" aria-hidden />
            </span>
            <h3 className="text-lg font-semibold">モバイルに最適化</h3>
            <p className="text-sm text-muted-foreground">
              ボトムタブ + FAB で片手操作。復習カードは左右スワイプで評価。
              ハプティクスと 3D フリップでネイティブアプリ級の操作感。
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 md:p-8 space-y-3">
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
        <p>© {new Date().getFullYear()} Anki AI Flashcard · 個人学習支援ツール</p>
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
