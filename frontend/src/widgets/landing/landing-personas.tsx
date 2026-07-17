import type { ComponentType } from "react";
import { Briefcase, Terminal } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/shared/ui/card";

type PersonaIcon = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
}>;

interface Persona {
  icon: PersonaIcon;
  audience: string;
  title: string;
  description: string;
  points: readonly string[];
}

const personas: readonly Persona[] = [
  {
    icon: Briefcase,
    audience: "資格学習のビジネスパーソン",
    title: "スキマ時間を、合格への一歩に",
    description:
      "テキストや講義メモを放り込むだけ。通勤中や休憩中に、今日出すべき問いだけが届きます。",
    points: [
      "参考書の要点メモから問題を量産",
      "苦手な論点は間隔反復で重点的に",
      "モバイルで片手のまま復習",
    ],
  },
  {
    icon: Terminal,
    audience: "エンジニア",
    title: "調べ直しを、身につく知識に",
    description:
      "ドキュメントやトラブルシュートの学びをカード化。同じことを二度調べる時間を減らします。",
    points: [
      "コマンドや API 仕様を問い形式で定着",
      "キーボード駆動でサッと記録・復習",
      "デッキで技術領域ごとに整理",
    ],
  },
];

/**
 * 主要ペルソナ向けの利用例。抽象的な機能ではなく「あなたの使い方」を見せる。
 */
export function LandingPersonas() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14 md:px-8 md:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
        <h2 className="text-2xl font-bold md:text-3xl">こんな人に</h2>
        <p className="mt-3 text-sm text-muted-foreground md:text-base">
          覚え続ける必要がある人ほど、効いてきます。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {personas.map((persona) => {
          const Icon = persona.icon;
          return (
            <Card key={persona.audience} className="p-1">
              <CardHeader>
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--forest-faint)] text-[var(--forest)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-xs font-medium text-[var(--forest)]">
                  {persona.audience}
                </p>
                <CardTitle className="text-lg">{persona.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {persona.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {persona.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--forest)]"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
