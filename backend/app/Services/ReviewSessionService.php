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
        return $this->scheduleRepository->dueCardsForUser(
            $userId,
            now(),
            $deckId,
            $limit,
        );
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
