import { Fragment } from "react";

/**
 * Anki 風 cloze 記法 `{{cN::xxx}}` を含むテキストを描画する。
 *
 * - mode="front": 答えを伏字 (点線ボックス + 透明テキスト) で表示。表面/質問面で使う
 * - mode="back": 答えをハイライト (primary 色のチップ) で表示。裏面/答え面で使う
 *
 * 1 文に複数の {{cN::xxx}} があってもすべて変換する (n は任意の数字)。
 * 入力テキストに cloze 記法が含まれない場合は、通常の whitespace-pre-wrap で
 * テキストをそのまま描画する (cloze_like 以外でも安全に使える)。
 */
type Mode = "front" | "back";

interface ClozeTextProps {
  text: string;
  mode: Mode;
  className?: string;
}

const CLOZE_RE = /\{\{c\d+::([^}]*)\}\}/g;

interface Segment {
  kind: "text" | "cloze";
  value: string;
}

function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CLOZE_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ kind: "text", value: text.slice(lastIndex, start) });
    }
    segments.push({ kind: "cloze", value: match[1] ?? "" });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

export function ClozeText({ text, mode, className }: ClozeTextProps) {
  const segments = tokenize(text);

  return (
    <span className={`whitespace-pre-wrap break-words ${className ?? ""}`}>
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <Fragment key={i}>{seg.value}</Fragment>;
        }

        const display = seg.value.trim() === "" ? " " : seg.value;
        if (mode === "front") {
          return (
            <span
              key={i}
              role="presentation"
              aria-label="伏字"
              className="
                inline-block min-w-12 px-2 py-0.5 mx-0.5 rounded
                border border-dashed border-muted-foreground/60
                bg-muted/40 text-transparent select-none align-baseline
              "
            >
              {/* 幅を保つため元の語と同じ長さの空白を出す */}
              {display.replace(/./gu, " ")}
            </span>
          );
        }
        return (
          <span
            key={i}
            className="
              inline-block px-1 mx-0.5 rounded
              bg-primary/15 text-primary font-medium align-baseline
            "
          >
            {display}
          </span>
        );
      })}
    </span>
  );
}
