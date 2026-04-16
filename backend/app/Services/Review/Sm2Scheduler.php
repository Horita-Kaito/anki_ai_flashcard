<?php

declare(strict_types=1);

namespace App\Services\Review;

use App\Contracts\Services\Review\SchedulerInterface;
use App\Enums\ReviewRating;
use App\Enums\ScheduleState;
use App\Models\CardSchedule;

/**
 * SM-2 ライクな簡易スケジューラ。
 *
 * 設計原則:
 * - 純粋関数 (副作用なし、DB に触らない)
 * - state と rating の組み合わせで一意に次回スケジュールが決まる
 * - ease_factor は 1.3 〜 2.5 の範囲でクランプ
 *
 * 状態遷移:
 *   new/learning + Again → learning (10分後)
 *   new/learning + Hard  → learning (30分後、state=new)
 *   new/learning + Good  → review (1日後)
 *   new/learning + Easy  → review (4日後)
 *   review + Again → relearning (lapse_count++、10分後、EF -= 0.2)
 *   review + Hard  → review (interval * 1.2、EF -= 0.15)
 *   review + Good  → review (interval * EF)
 *   review + Easy  → review (interval * EF * 1.3、EF += 0.15)
 *   relearning は learning と同じ扱い
 */
final class Sm2Scheduler implements SchedulerInterface
{
    private const MIN_EASE_FACTOR = 1.3;

    private const MAX_EASE_FACTOR = 2.5;

    private const INITIAL_EASE_FACTOR = 2.5;

    public function next(
        CardSchedule $current,
        ReviewRating $rating,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        $state = $current->state instanceof ScheduleState
            ? $current->state
            : ScheduleState::from((string) $current->state);
        $currentEase = (float) $current->ease_factor;
        $currentInterval = (int) $current->interval_days;
        $currentReps = (int) $current->repetitions;
        $currentLapses = (int) $current->lapse_count;

        $update = match ($state) {
            ScheduleState::New, ScheduleState::Learning, ScheduleState::Relearning => $this->processLearning(
                $rating,
                $currentEase,
                $currentReps,
                $currentLapses,
                $state,
                $now,
            ),
            ScheduleState::Review => $this->processReview(
                $rating,
                $currentEase,
                $currentInterval,
                $currentReps,
                $currentLapses,
                $now,
            ),
        };

        if ($state === ScheduleState::Review && $this->isBeforeDue($current, $now)) {
            $update = $this->applyEarlyReviewPolicy($rating, $update, $currentInterval, $currentEase, $currentReps, $currentLapses, $now);
        }

        return $update;
    }

    private function isBeforeDue(CardSchedule $schedule, \DateTimeInterface $now): bool
    {
        $raw = $schedule->getRawOriginal('due_at') ?? $schedule->getAttributes()['due_at'] ?? null;
        if ($raw === null) {
            return false;
        }
        $dueTs = $raw instanceof \DateTimeInterface ? $raw->getTimestamp() : strtotime((string) $raw);

        return $dueTs !== false && $now->getTimestamp() < $dueTs;
    }

    private function applyEarlyReviewPolicy(
        ReviewRating $rating,
        ScheduleUpdate $computed,
        int $currentInterval,
        float $currentEase,
        int $currentReps,
        int $currentLapses,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        return match ($rating) {
            // Again/Hard → ネガティブ評価は常に反映 (忘れてた事実を記録)
            ReviewRating::Again, ReviewRating::Hard => $computed,
            // Good → due 前なので interval 据え置き
            ReviewRating::Good => new ScheduleUpdate(
                repetitions: $currentReps + 1,
                intervalDays: $currentInterval,
                easeFactor: $currentEase,
                dueAt: $this->addDays($now, $currentInterval),
                lastReviewedAt: $now,
                lapseCount: $currentLapses,
                state: ScheduleState::Review->value,
            ),
            // Easy → 前倒し卒業を許可 (interval を伸ばす)
            ReviewRating::Easy => $computed,
        };
    }

    /**
     * new / learning / relearning 時の処理。
     * Good 以上で review 状態に昇格する。
     */
    private function processLearning(
        ReviewRating $rating,
        float $easeFactor,
        int $repetitions,
        int $lapseCount,
        ScheduleState $currentState,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        return match ($rating) {
            ReviewRating::Again => new ScheduleUpdate(
                repetitions: 0,
                intervalDays: 0,
                easeFactor: $easeFactor > 0 ? $easeFactor : self::INITIAL_EASE_FACTOR,
                dueAt: $this->addMinutes($now, 10),
                lastReviewedAt: $now,
                lapseCount: $lapseCount,
                state: ScheduleState::Learning->value,
            ),
            ReviewRating::Hard => new ScheduleUpdate(
                repetitions: 0,
                intervalDays: 0,
                easeFactor: $easeFactor > 0 ? $easeFactor : self::INITIAL_EASE_FACTOR,
                dueAt: $this->addMinutes($now, 30),
                lastReviewedAt: $now,
                lapseCount: $lapseCount,
                state: ScheduleState::Learning->value,
            ),
            ReviewRating::Good => new ScheduleUpdate(
                repetitions: $repetitions + 1,
                intervalDays: 1,
                easeFactor: $easeFactor > 0 ? $easeFactor : self::INITIAL_EASE_FACTOR,
                dueAt: $this->addDays($now, 1),
                lastReviewedAt: $now,
                lapseCount: $lapseCount,
                state: ScheduleState::Review->value,
            ),
            ReviewRating::Easy => new ScheduleUpdate(
                repetitions: $repetitions + 1,
                intervalDays: 4,
                easeFactor: $this->clampEase(($easeFactor > 0 ? $easeFactor : self::INITIAL_EASE_FACTOR) + 0.15),
                dueAt: $this->addDays($now, 4),
                lastReviewedAt: $now,
                lapseCount: $lapseCount,
                state: ScheduleState::Review->value,
            ),
        };
    }

    /**
     * review 状態時の処理。
     */
    private function processReview(
        ReviewRating $rating,
        float $easeFactor,
        int $intervalDays,
        int $repetitions,
        int $lapseCount,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        return match ($rating) {
            // 忘却 → relearning
            ReviewRating::Again => new ScheduleUpdate(
                repetitions: 0,
                intervalDays: 0,
                easeFactor: $this->clampEase($easeFactor - 0.2),
                dueAt: $this->addMinutes($now, 10),
                lastReviewedAt: $now,
                lapseCount: $lapseCount + 1,
                state: ScheduleState::Relearning->value,
            ),
            ReviewRating::Hard => $this->multiplyInterval(
                $rating,
                $intervalDays,
                1.2,
                $this->clampEase($easeFactor - 0.15),
                $repetitions,
                $lapseCount,
                $now,
            ),
            ReviewRating::Good => $this->multiplyInterval(
                $rating,
                $intervalDays,
                $easeFactor,
                $easeFactor,
                $repetitions,
                $lapseCount,
                $now,
            ),
            ReviewRating::Easy => $this->multiplyInterval(
                $rating,
                $intervalDays,
                $easeFactor * 1.3,
                $this->clampEase($easeFactor + 0.15),
                $repetitions,
                $lapseCount,
                $now,
            ),
        };
    }

    private function multiplyInterval(
        ReviewRating $rating,
        int $currentInterval,
        float $multiplier,
        float $nextEase,
        int $repetitions,
        int $lapseCount,
        \DateTimeInterface $now,
    ): ScheduleUpdate {
        // 最低でも前回+1日
        $next = max($currentInterval + 1, (int) ceil($currentInterval * $multiplier));

        return new ScheduleUpdate(
            repetitions: $repetitions + 1,
            intervalDays: $next,
            easeFactor: $nextEase,
            dueAt: $this->addDays($now, $next),
            lastReviewedAt: $now,
            lapseCount: $lapseCount,
            state: ScheduleState::Review->value,
        );
    }

    private function clampEase(float $ease): float
    {
        return max(self::MIN_EASE_FACTOR, min(self::MAX_EASE_FACTOR, $ease));
    }

    private function addMinutes(\DateTimeInterface $now, int $minutes): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('@'.$now->getTimestamp()))
            ->modify("+{$minutes} minutes");
    }

    private function addDays(\DateTimeInterface $now, int $days): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('@'.$now->getTimestamp()))
            ->modify("+{$days} days");
    }
}
