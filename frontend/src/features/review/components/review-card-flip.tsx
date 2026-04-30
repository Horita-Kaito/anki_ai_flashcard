"use client";

import type { Card } from "@/entities/card/types";
import { ClozeText } from "@/shared/ui/cloze-text";
import { haptic } from "@/shared/lib/haptics";
import { extractClozeAnswers } from "@/shared/utils/cloze";
import { SchedulerBadge } from "@/shared/ui/scheduler-badge";

interface ReviewCardFlipProps {
  card: Card;
  showAnswer: boolean;
  onReveal: () => void;
  disabled?: boolean;
}

/**
 * 復習カード。
 *
 * - 問題のみ表示 → タップで答えを問題の下に展開表示
 * - 評価は下部の固定ボタンバーで行う
 */
export function ReviewCardFlip({
  card,
  showAnswer,
  onReveal,
  disabled,
}: ReviewCardFlipProps) {
  function handleTap() {
    if (!showAnswer && !disabled) {
      haptic("light");
      onReveal();
    }
  }

  return (
    <div
      onClick={handleTap}
      onKeyDown={(e) => {
        if (!showAnswer && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onReveal();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={showAnswer ? "答え表示中" : "タップして答えを表示"}
      className={`
        border rounded-xl p-6 md:p-8 bg-card
        cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring
        ${!showAnswer ? "min-h-[50vh] md:min-h-[40vh] flex flex-col" : ""}
      `}
    >
      <header className="flex items-center gap-2 mb-4 flex-wrap">
        {card.tags?.map((t) => (
          <span
            key={t.id}
            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
          >
            {t.name}
          </span>
        ))}
        <SchedulerBadge scheduler={card.scheduler} size="xs" />
      </header>

      {/* 問題 */}
      <div
        className={
          showAnswer
            ? "pb-4"
            : "flex-1 flex items-center justify-center text-center"
        }
      >
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            問題
          </p>
          {card.card_type === "cloze_like" ? (
            <p className="text-lg md:text-xl">
              <ClozeText
                text={card.question}
                mode={showAnswer ? "back" : "front"}
              />
            </p>
          ) : (
            <p className="text-lg md:text-xl whitespace-pre-wrap break-words">
              {card.question}
            </p>
          )}
        </div>
      </div>

      {/* 答え (展開) */}
      {showAnswer ? (
        <div className="border-t pt-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">答え</p>
          {(() => {
            // cloze_like は質問本文側で revealed 表示済みなので、
            // 答え欄は question から導出した正解一覧に置き換える。
            // (AI が answer に最初の cN しか入れない場合のフォールバック)
            if (card.card_type === "cloze_like") {
              const answers = extractClozeAnswers(card.question).filter(
                (a) => a.trim() !== ""
              );
              if (answers.length > 0) {
                return (
                  <p className="text-base md:text-lg font-medium break-words">
                    正解: {answers.join("、")}
                  </p>
                );
              }
            }
            return (
              <p className="text-base md:text-lg whitespace-pre-wrap break-words">
                {card.answer}
              </p>
            );
          })()}
          {card.explanation && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t pt-3">
              {card.explanation}
            </p>
          )}
          <p className="text-xs text-muted-foreground text-center pt-2 md:hidden">
            下のボタンで評価
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center mt-4 md:hidden">
          タップで答え表示
        </p>
      )}
    </div>
  );
}
