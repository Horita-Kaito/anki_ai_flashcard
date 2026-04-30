<?php

declare(strict_types=1);

namespace App\Services\Review;

use App\Contracts\Services\Review\SchedulerInterface;
use App\Enums\ReviewRating;
use App\Enums\ScheduleState;
use App\Models\CardSchedule;

/**
 * FSRS-5 (Free Spaced Repetition Scheduler) ライクな実装。
 *
 * 公式仕様: https://github.com/open-spaced-repetition/fsrs4anki/wiki
 *
 * 設計原則:
 *   - 純粋関数 (副作用なし、DB に触らない)
 *   - stability (S, 単位: 日) と difficulty (D, 1.0〜10.0) を内部状態として持つ
 *   - desired_retention (デフォルト 0.9) から次回 interval を逆算
 *   - SM-2 互換のため ease_factor も既存値を維持して返す (FSRS 内では使わない)
 *
 * 状態遷移は SM-2 と同じ枠組みを踏襲:
 *   New + Again/Hard       → Learning (短時間後)
 *   New + Good             → Review   (FSRS 計算 interval)
 *   New + Easy             → Review   (FSRS 計算 interval)
 *   Learning/Relearning    → Again/Hard で同状態維持、Good/Easy で Review に昇格
 *   Review + Again         → Relearning (lapse_count++)
 *   Review + Hard/Good/Easy → Review
 */
final class FsrsScheduler implements SchedulerInterface
{
    /**
     * FSRS-5 公式デフォルトパラメータ (open-spaced-repetition リファレンス)。
     * w[0..3]: 初期 stability (Again/Hard/Good/Easy)
     * w[4..6]: 初期 difficulty 計算
     * w[7]:    difficulty 平均回帰係数
     * w[8..10]: post-recall stability 計算
     * w[11..14]: post-lapse stability 計算
     * w[15..16]: hard penalty / easy bonus
     * w[17..18]: short-term review (FSRS-5)
     */
    private const W = [
        0.4072, 1.1829, 3.1262, 15.4722,
        7.2102, 0.5316, 1.0651,
        0.0234,
        1.616, 0.1544, 1.0824,
        1.9813, 0.0953, 0.2975, 2.2042,
        0.2407, 2.9466,
        0.5034, 0.6567,
    ];

    /** FSRS-5 forgetting curve 定数 */
    private const FACTOR = 19.0 / 81.0;

    private const DECAY = -0.5;

    private const MIN_DIFFICULTY = 1.0;

    private const MAX_DIFFICULTY = 10.0;

    private const MIN_STABILITY = 0.01;

    /**
     * 学習中 (Learning/Relearning) で Again/Hard を出した時の次回猶予 (分)。
     * SM-2 と同じ感覚値で揃える。
     */
    private const LEARNING_AGAIN_MINUTES = 10;

    private const LEARNING_HARD_MINUTES = 30;

    public function __construct(
        /** 目標想起率 0 < r < 1 (典型 0.9) */
        private readonly float $desiredRetention = 0.9,
    ) {}

    public function next(
        CardSchedule $current,
        ReviewRating $rating,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        $r = $this->ratingToInt($rating);
        $state = $this->stateOf($current);

        $isFirstReview = $current->stability === null || $current->stability <= 0.0;

        // S / D を算出 (初回は初期化、以降は更新)
        if ($isFirstReview) {
            $newS = $this->initStability($r);
            $newD = $this->initDifficulty($r);
        } else {
            $oldS = (float) $current->stability;
            $oldD = (float) ($current->difficulty ?? $this->initDifficulty(3));
            $elapsed = $this->elapsedDays($this->rawLastReviewedAt($current), $now);
            $retrievability = $this->retrievability($elapsed, $oldS);

            $newD = $this->nextDifficulty($oldD, $r);
            $newS = $r === 1
                ? $this->postLapseStability($oldD, $oldS, $retrievability)
                : $this->postRecallStability($oldD, $oldS, $retrievability, $r);
        }

        $newS = max(self::MIN_STABILITY, $newS);
        $newD = $this->clampDifficulty($newD);

        // 状態遷移と due_at 計算
        return match (true) {
            // 学習フェーズで Again/Hard: 短時間後に再出題、Review には昇格しない
            in_array($state, [ScheduleState::New, ScheduleState::Learning, ScheduleState::Relearning], true)
                && in_array($r, [1, 2], true) => $this->buildLearningStep($current, $r, $newS, $newD, $now, $state),

            // それ以外 (Review に昇格 or Review 内更新) で Again: lapse として Relearning へ
            $r === 1 => $this->buildLapse($current, $newS, $newD, $now),

            // 通常: Review 状態で次回 interval を S と desired_retention から逆算
            default => $this->buildReview($current, $newS, $newD, $now),
        };
    }

    private function buildLearningStep(
        CardSchedule $current,
        int $rating,
        float $newS,
        float $newD,
        \DateTimeInterface $now,
        ScheduleState $currentState,
    ): ScheduleUpdate {
        $minutes = $rating === 1 ? self::LEARNING_AGAIN_MINUTES : self::LEARNING_HARD_MINUTES;
        $nextState = $currentState === ScheduleState::New
            ? ScheduleState::Learning
            : $currentState; // Learning / Relearning は維持

        return new ScheduleUpdate(
            repetitions: 0,
            intervalDays: 0,
            easeFactor: $this->preserveEase($current),
            dueAt: $this->addMinutes($now, $minutes),
            lastReviewedAt: $now,
            lapseCount: $current->lapse_count,
            state: $nextState->value,
            stability: $newS,
            difficulty: $newD,
        );
    }

    private function buildLapse(
        CardSchedule $current,
        float $newS,
        float $newD,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        return new ScheduleUpdate(
            repetitions: 0,
            intervalDays: 0,
            easeFactor: $this->preserveEase($current),
            dueAt: $this->addMinutes($now, self::LEARNING_AGAIN_MINUTES),
            lastReviewedAt: $now,
            lapseCount: $current->lapse_count + 1,
            state: ScheduleState::Relearning->value,
            stability: $newS,
            difficulty: $newD,
        );
    }

    private function buildReview(
        CardSchedule $current,
        float $newS,
        float $newD,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        $interval = max(1, $this->nextInterval($newS));

        return new ScheduleUpdate(
            repetitions: $current->repetitions + 1,
            intervalDays: $interval,
            easeFactor: $this->preserveEase($current),
            dueAt: $this->addDays($now, $interval),
            lastReviewedAt: $now,
            lapseCount: $current->lapse_count,
            state: ScheduleState::Review->value,
            stability: $newS,
            difficulty: $newD,
        );
    }

    /* ========================
     * FSRS-5 数式
     * ======================== */

    /**
     * 初期 stability (Again=1 ... Easy=4)。
     */
    private function initStability(int $rating): float
    {
        return max(self::MIN_STABILITY, self::W[$rating - 1]);
    }

    /**
     * 初期 difficulty: w4 - exp(w5 * (rating - 1)) + 1
     * Easy で低く、Again で高く出る (10 が最難)。
     */
    private function initDifficulty(int $rating): float
    {
        $d = self::W[4] - exp(self::W[5] * ($rating - 1)) + 1.0;

        return $this->clampDifficulty($d);
    }

    /**
     * difficulty 更新 + 平均回帰。
     * D' = D - w6 * (rating - 3)  ← Good (3) が中立、Easy (4) で減、Again (1) で増
     * D'' = w7 * D_init(Good) + (1 - w7) * D'  ← 初期値へ少し引き戻す
     */
    private function nextDifficulty(float $d, int $rating): float
    {
        $next = $d - self::W[6] * ($rating - 3);
        $meanReverted = self::W[7] * $this->initDifficulty(3) + (1 - self::W[7]) * $next;

        return $this->clampDifficulty($meanReverted);
    }

    /**
     * 想起成功時の stability 更新。Hard で控えめ、Easy で大盤振る舞い。
     */
    private function postRecallStability(float $d, float $s, float $r, int $rating): float
    {
        $hardPenalty = $rating === 2 ? self::W[15] : 1.0;
        $easyBonus = $rating === 4 ? self::W[16] : 1.0;
        $factor = exp(self::W[8])
            * (11 - $d)
            * pow($s, -self::W[9])
            * (exp((1 - $r) * self::W[10]) - 1)
            * $hardPenalty
            * $easyBonus;

        return $s * (1 + $factor);
    }

    /**
     * Again 時の stability 計算。完全リセットせず「忘れたが再学習しやすさは履歴に依存」を反映。
     */
    private function postLapseStability(float $d, float $s, float $r): float
    {
        return self::W[11]
            * pow($d, -self::W[12])
            * (pow($s + 1, self::W[13]) - 1)
            * exp((1 - $r) * self::W[14]);
    }

    /**
     * 経過日数 t と stability S から想起率を返す (FSRS-5 forgetting curve)。
     */
    private function retrievability(float $elapsedDays, float $stability): float
    {
        return pow(1 + self::FACTOR * $elapsedDays / max(self::MIN_STABILITY, $stability), self::DECAY);
    }

    /**
     * 次回 interval を desired_retention から逆算。
     * I = S / FACTOR * (R^(1/DECAY) - 1)
     */
    private function nextInterval(float $stability): int
    {
        $raw = $stability / self::FACTOR * (pow($this->desiredRetention, 1 / self::DECAY) - 1);

        return (int) round(max(1.0, $raw));
    }

    /* ========================
     * Helpers
     * ======================== */

    private function ratingToInt(ReviewRating $rating): int
    {
        return match ($rating) {
            ReviewRating::Again => 1,
            ReviewRating::Hard => 2,
            ReviewRating::Good => 3,
            ReviewRating::Easy => 4,
        };
    }

    private function stateOf(CardSchedule $current): ScheduleState
    {
        return $current->state instanceof ScheduleState
            ? $current->state
            : ScheduleState::from((string) $current->state);
    }

    private function elapsedDays(mixed $lastReviewedAt, \DateTimeInterface $now): float
    {
        if ($lastReviewedAt === null) {
            return 0.0;
        }
        $ts = $lastReviewedAt instanceof \DateTimeInterface
            ? $lastReviewedAt->getTimestamp()
            : strtotime((string) $lastReviewedAt);
        if ($ts === false) {
            return 0.0;
        }

        return max(0.0, ($now->getTimestamp() - $ts) / 86400.0);
    }

    /**
     * datetime cast を経由せずに last_reviewed_at の raw 値を取得する。
     * 純粋関数として動作させるため、Eloquent の cast 解決 (DB connection 要求) を避ける。
     */
    private function rawLastReviewedAt(CardSchedule $current): mixed
    {
        return $current->getRawOriginal('last_reviewed_at')
            ?? $current->getAttributes()['last_reviewed_at']
            ?? null;
    }

    private function clampDifficulty(float $d): float
    {
        return max(self::MIN_DIFFICULTY, min(self::MAX_DIFFICULTY, $d));
    }

    /**
     * SM-2 とのデータ後方互換のため、ease_factor は既存値を維持して返す。
     * 値が無ければ SM-2 の初期値 2.5 で埋める。
     */
    private function preserveEase(CardSchedule $current): float
    {
        $existing = (float) $current->ease_factor;

        return $existing > 0 ? $existing : 2.5;
    }

    private function addMinutes(\DateTimeInterface $now, int $minutes): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('@'.$now->getTimestamp()))->modify("+{$minutes} minutes");
    }

    private function addDays(\DateTimeInterface $now, int $days): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('@'.$now->getTimestamp()))->modify("+{$days} days");
    }
}
