<?php

declare(strict_types=1);

namespace App\Contracts\Services\Review;

use App\Enums\ReviewRating;
use App\Models\CardSchedule;
use App\Services\Review\ScheduleUpdate;

/**
 * 復習スケジューラ。評価結果から次回出題日を算出する純粋ロジック。
 * SM-2, FSRS 等の実装を差し替え可能。
 */
interface SchedulerInterface
{
    public function next(
        CardSchedule $current,
        ReviewRating $rating,
        \DateTimeInterface $now,
    ): ScheduleUpdate;
}
