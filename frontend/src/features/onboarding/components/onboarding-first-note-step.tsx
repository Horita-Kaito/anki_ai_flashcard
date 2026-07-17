import { NotebookPen, Sparkles } from "lucide-react";

import { Button } from "@/shared/ui/button";

const EXAMPLE_NOTES = [
  "簿記: 減価償却の定率法は、期首帳簿価額 × 償却率で計算する",
  "TCP の 3 ウェイハンドシェイクは SYN → SYN/ACK → ACK の順",
  "英語: \"in terms of\" は「〜の観点では」という意味",
] as const;

interface OnboardingFirstNoteStepProps {
  onWriteNote: () => void;
  onSkip: () => void;
}

export function OnboardingFirstNoteStep({
  onWriteNote,
  onSkip,
}: OnboardingFirstNoteStepProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium text-[var(--forest)]">準備ができました</p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          最初のメモを書いてみましょう
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          30 秒で大丈夫。今日学んだこと・覚えたいことを 1 つ書くと、
          AI がフラッシュカード候補を作ります。それを採用すれば、明日から復習に出ます。
        </p>
      </header>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">メモの例</p>
        <ul className="space-y-2">
          {EXAMPLE_NOTES.map((example) => (
            <li
              key={example}
              className="knowledge-text rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed text-foreground/90"
            >
              {example}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <Button size="touch" className="w-full" onClick={onWriteNote}>
          <NotebookPen data-icon="inline-start" />
          最初のメモを書く
          <Sparkles data-icon="inline-end" />
        </Button>
        <Button variant="ghost" size="touch" className="w-full" onClick={onSkip}>
          あとで書く(ダッシュボードへ)
        </Button>
      </div>
    </div>
  );
}
