import { ShieldCheck } from "lucide-react";

/**
 * 信頼メッセージ。AI 候補は自動でカードにならないという中核の約束を伝える。
 */
export function LandingTrust() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-col items-start gap-4 rounded-2xl border bg-[var(--forest-faint)]/60 p-6 md:flex-row md:items-center md:gap-6 md:p-8">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-background text-[var(--forest)] shadow-sm">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold md:text-xl">
            AI が作った候補は、自動でカードになりません。
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            採用するのはあなたです。何を覚えるかを AI に決めさせない。
            だから、残るのは自分が納得したカードだけになります。
          </p>
        </div>
      </div>
    </section>
  );
}
