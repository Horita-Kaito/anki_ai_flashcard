<?php

declare(strict_types=1);

namespace App\Services\Review;

/**
 * スケジューラが返す次回スケジュール情報。
 * CardSchedule 更新時にこの値を適用する。
 *
 * stability / difficulty は FSRS でのみ算出される (SM-2 では null)。
 * SM-2 / FSRS のどちらでも使えるよう ease_factor も保持し、
 * 表示用に「使われない値」も既存値を維持する。
 */
final class ScheduleUpdate
{
    public function __construct(
        public readonly int $repetitions,
        public readonly int $intervalDays,
        public readonly float $easeFactor,
        public readonly \DateTimeInterface $dueAt,
        public readonly \DateTimeInterface $lastReviewedAt,
        public readonly int $lapseCount,
        public readonly string $state,
        public readonly ?float $stability = null,
        public readonly ?float $difficulty = null,
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        $arr = [
            'repetitions' => $this->repetitions,
            'interval_days' => $this->intervalDays,
            'ease_factor' => $this->easeFactor,
            'due_at' => $this->dueAt,
            'last_reviewed_at' => $this->lastReviewedAt,
            'lapse_count' => $this->lapseCount,
            'state' => $this->state,
        ];
        if ($this->stability !== null) {
            $arr['stability'] = $this->stability;
        }
        if ($this->difficulty !== null) {
            $arr['difficulty'] = $this->difficulty;
        }

        return $arr;
    }
}
