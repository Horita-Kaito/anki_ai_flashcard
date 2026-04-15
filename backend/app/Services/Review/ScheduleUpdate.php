<?php

declare(strict_types=1);

namespace App\Services\Review;

/**
 * スケジューラが返す次回スケジュール情報。
 * CardSchedule 更新時にこの値を適用する。
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
    ) {}

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'repetitions' => $this->repetitions,
            'interval_days' => $this->intervalDays,
            'ease_factor' => $this->easeFactor,
            'due_at' => $this->dueAt,
            'last_reviewed_at' => $this->lastReviewedAt,
            'lapse_count' => $this->lapseCount,
            'state' => $this->state,
        ];
    }
}
