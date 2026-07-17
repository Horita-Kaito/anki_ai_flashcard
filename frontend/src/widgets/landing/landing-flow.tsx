import type { ComponentType } from "react";
import { NotebookPen, Sparkles, CheckCircle2, GraduationCap } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type StepIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

interface Step {
  icon: StepIcon;
  title: string;
  description: string;
  accent: string;
  tint: string;
}

const steps: readonly Step[] = [
  {
    icon: NotebookPen,
    title: "メモを書く",
    description: "学んだことを、そのままの言葉で書き留めます。整える必要はありません。",
    accent: "text-[var(--forest)]",
    tint: "bg-[var(--forest-faint)]",
  },
  {
    icon: Sparkles,
    title: "AI が候補を作る",
    description: "メモから問いと答えの候補を自動で提案。切り口の抜けを補います。",
    accent: "text-[var(--bronze)]",
    tint: "bg-[var(--bronze-faint)]",
  },
  {
    icon: CheckCircle2,
    title: "自分で選んで採用",
    description: "残すもの・直すもの・捨てるものを判断。あなたのカードだけが残ります。",
    accent: "text-[var(--persimmon)]",
    tint: "bg-[var(--persimmon-faint)]",
  },
  {
    icon: GraduationCap,
    title: "忘れる前に復習",
    description: "間隔反復が次に出会う日を決め、記憶が薄れる直前に呼び戻します。",
    accent: "text-[var(--forest)]",
    tint: "bg-[var(--forest-faint)]",
  },
];

/**
 * 中核 4 ステップのフロー。左から右 (モバイルは縦) の流れとして見せる。
 */
export function LandingFlow() {
  return (
    <section
      id="flow"
      className="mx-auto max-w-5xl scroll-mt-8 px-4 py-14 md:px-8 md:py-20"
    >
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
        <h2 className="text-2xl font-bold md:text-3xl">
          書いてから、覚えるまで
        </h2>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          4 つのステップだけ。難しい設定も、整理の手間もありません。
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="relative rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <span className="absolute right-4 top-4 text-2xl font-bold tabular-nums text-muted-foreground/25">
                {index + 1}
              </span>
              <span
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-xl",
                  step.tint,
                  step.accent
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
