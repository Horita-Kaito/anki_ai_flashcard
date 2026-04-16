<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\CardReviewRepositoryInterface;
use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Contracts\Services\Review\SchedulerInterface;
use App\Enums\ReviewRating;
use App\Exceptions\Domain\CardNotFoundException;
use App\Models\Card;
use App\Models\CardReview;
use App\Models\CardSchedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * 復習セッションのオーケストレーション。
 *
 * - 今日の復習対象カード取得
 * - 回答処理 (レビュー記録 + スケジュール更新) を 1 トランザクションで
 */
final class ReviewSessionService
{
    public function __construct(
        private readonly CardScheduleRepositoryInterface $scheduleRepository,
        private readonly CardReviewRepositoryInterface $reviewRepository,
        private readonly CardRepositoryInterface $cardRepository,
        private readonly SchedulerInterface $scheduler,
    ) {}

    /**
     * @return array<int, CardSchedule> card + tags が eager load 済み
     */
    public function dueCardsForUser(int $userId, ?int $deckId, int $limit = 50): array
    {
        $this->applyOverdueDecay($userId);

        return $this->scheduleRepository->dueCardsForUser(
            $userId,
            now(),
            $deckId,
            $limit,
        );
    }

    /**
     * 期限切れカードの interval を減衰させる (On-demand interval decay)。
     *
     * overdue_days <= 1: 変更なし
     * overdue_days <= 7: interval *= 0.8
     * overdue_days <= 14: interval *= 0.5
     * overdue_days > 14: interval = 1 (リセット)
     */
    private function applyOverdueDecay(int $userId): void
    {
        $now = now();
        $overdueSchedules = $this->scheduleRepository->overdueCardsForUser($userId, $now);

        foreach ($overdueSchedules as $schedule) {
            $dueAt = $schedule->due_at instanceof Carbon
                ? $schedule->due_at
                : Carbon::parse($schedule->due_at);

            $overdueDays = (int) $dueAt->diffInDays($now, false);
            if ($overdueDays <= 1) {
                continue;
            }

            $currentInterval = (int) $schedule->interval_days;

            if ($overdueDays <= 7) {
                $newInterval = max(1, (int) floor($currentInterval * 0.8));
            } elseif ($overdueDays <= 14) {
                $newInterval = max(1, (int) floor($currentInterval * 0.5));
            } else {
                $newInterval = 1;
            }

            if ($newInterval !== $currentInterval) {
                $this->scheduleRepository->update($schedule, [
                    'interval_days' => $newInterval,
                ]);
            }
        }
    }

    /**
     * 回答を記録し、スケジュールを更新する。
     *
     * @return array{card: Card, schedule: CardSchedule, review: CardReview}
     *
     * @throws CardNotFoundException
     */
    public function recordAnswer(
        int $userId,
        int $cardId,
        ReviewRating $rating,
        ?int $responseTimeMs = null,
    ): array {
        $card = $this->cardRepository->findForUser($userId, $cardId);
        if ($card === null) {
            throw CardNotFoundException::make($cardId);
        }

        $schedule = $this->scheduleRepository->findByCard($cardId);
        if ($schedule === null) {
            throw CardNotFoundException::make($cardId);
        }

        $now = now();
        $previousDueAt = $schedule->due_at;
        $previousSnapshot = [
            'repetitions' => $schedule->repetitions,
            'interval_days' => $schedule->interval_days,
            'ease_factor' => (float) $schedule->ease_factor,
            'lapse_count' => $schedule->lapse_count,
            'state' => $schedule->state instanceof \BackedEnum
                ? $schedule->state->value
                : (string) $schedule->state,
        ];

        $update = $this->scheduler->next($schedule, $rating, $now->toDateTime());

        return DB::transaction(function () use (
            $userId,
            $cardId,
            $rating,
            $responseTimeMs,
            $schedule,
            $update,
            $now,
            $previousDueAt,
            $previousSnapshot,
        ) {
            $updatedSchedule = $this->scheduleRepository->update($schedule, $update->toArray());

            // Auto-archive: interval が閾値以上なら自動アーカイブ
            $archiveThreshold = (int) config('ai.review.archive_interval_days', 180);
            if ($update->intervalDays >= $archiveThreshold) {
                $updatedSchedule = $this->scheduleRepository->archive($updatedSchedule);
            }

            $review = $this->reviewRepository->create([
                'user_id' => $userId,
                'card_id' => $cardId,
                'reviewed_at' => $now,
                'rating' => $rating->value,
                'scheduled_due_at' => $previousDueAt,
                'actual_interval_days' => $update->intervalDays,
                'response_time_ms' => $responseTimeMs,
                'schedule_snapshot_json' => $previousSnapshot,
            ]);

            return [
                'card' => $this->cardRepository->findForUser($userId, $cardId),
                'schedule' => $updatedSchedule,
                'review' => $review,
            ];
        });
    }
}
