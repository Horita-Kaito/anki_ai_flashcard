"use client";

import { useSwipeable } from "react-swipeable";
import type { Card } from "@/entities/card/types";
import type { ReviewRating } from "@/entities/review/types";
import { haptic } from "@/shared/lib/haptics";

interface ReviewCardFlipProps {
  card: Card;
  showAnswer: boolean;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
  disabled?: boolean;
}

/**
 * 復習カード (フリップ + スワイプ対応)。
 *
 * モバイルジェスチャ:
 * - 問題表示中: タップで答え表示
 * - 答え表示中: 左スワイプ = Again, 右 = Good, 下 = Hard, 上 = Easy
 *
 * アニメーション:
 * - 3D transform で flip (rotateY 180deg)
 * - スワイプ中は少しカードが回転 (フィードバック)
 */
export function ReviewCardFlip({
  card,
  showAnswer,
  onReveal,
  onRate,
  disabled,
}: ReviewCardFlipProps) {
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (!showAnswer || disabled) return;
      haptic("medium");
      onRate("again");
    },
    onSwipedRight: () => {
      if (!showAnswer || disabled) return;
      haptic("medium");
      onRate("good");
    },
    onSwipedDown: () => {
      if (!showAnswer || disabled) return;
      haptic("medium");
      onRate("hard");
    },
    onSwipedUp: () => {
      if (!showAnswer || disabled) return;
      haptic("medium");
      onRate("easy");
    },
    trackMouse: false,
    preventScrollOnSwipe: true,
    swipeDuration: 500,
  });

  function handleTap() {
    if (!showAnswer && !disabled) {
      haptic("light");
      onReveal();
    }
  }

  return (
    <div
      {...handlers}
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
        relative [perspective:1200px] min-h-[50vh] md:min-h-[40vh]
        cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring rounded-xl
      `}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className={`
          relative w-full h-full min-h-[50vh] md:min-h-[40vh]
          transition-transform duration-500 [transform-style:preserve-3d]
          ${showAnswer ? "[transform:rotateY(180deg)]" : ""}
        `}
      >
        {/* 表面: 問題 */}
        <div className="absolute inset-0 [backface-visibility:hidden] border rounded-xl p-6 md:p-8 bg-card flex flex-col">
          <header className="flex items-center gap-2 mb-4">
            {card.tags?.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {t.name}
              </span>
            ))}
          </header>
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                問題
              </p>
              <p className="text-lg md:text-xl whitespace-pre-wrap break-words">
                {card.question}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4 md:hidden">
            タップで答え表示
          </p>
        </div>

        {/* 裏面: 答え */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] border rounded-xl p-6 md:p-8 bg-card flex flex-col">
          <header className="flex items-center gap-2 mb-4">
            {card.tags?.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {t.name}
              </span>
            ))}
          </header>
          <div className="flex-1 flex flex-col justify-center gap-4">
            <div className="text-xs font-medium text-muted-foreground">
              答え
            </div>
            <p className="text-base md:text-lg whitespace-pre-wrap break-words">
              {card.answer}
            </p>
            {card.explanation && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t pt-3">
                {card.explanation}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4 md:hidden">
            ← Again / → Good / ↓ Hard / ↑ Easy
          </p>
        </div>
      </div>
    </div>
  );
}
