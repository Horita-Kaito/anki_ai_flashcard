<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\CardReviewRepositoryInterface;
use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Contracts\Services\Review\SchedulerResolverInterface;
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
        private readonly DeckRepositoryInterface $deckRepository,
        private readonly SchedulerResolverInterface $schedulerResolver,
    ) {}

    /**
     * @return array<int, CardSchedule> card + tags が eager load 済み
     */
    public function dueCardsForUser(int $userId, ?int $deckId, int $limit = 50): array
    {
        $this->applyOverdueDecay($userId);

        // 親デッキを指定された場合は、全子孫デッキのカードも対象に含める
        $deckIds = null;
        if ($deckId !== null) {
            $deckIds = [
                $deckId,
                ...$this->deckRepository->descendantIdsFor($userId, $deckId),
            ];
        }

        return $this->scheduleRepository->dueCardsForUser(
            $userId,
            now(),
            $deckIds,
            $limit,
        );
    }

    /**
     * 期限切れカードの interval を減衰させる (On-demand interval decay)。
     * Repository 側で 3 つの UPDATE 文に集約し、N 件のループ + refresh を回避する。
     */
    private function applyOverdueDecay(int $userId): void
    {
        $this->scheduleRepository->decayOverdueForUser($userId, now());
    }

    /**
     * まだ due でないカードを取得する (追加復習用)。
     *
     * @return array{cards: array<int, array{card: Card, days_until_due: int}>, total: int}
     */
    public function extraSession(int $userId): array
    {
        $schedules = $this->scheduleRepository->extraCardsForUser($userId, 10);

        $now = now();
        $items = [];
        foreach ($schedules as $schedule) {
            if ($schedule->card === null) {
                continue;
            }
            $dueAt = $schedule->due_at instanceof Carbon
                ? $schedule->due_at
                : Carbon::parse($schedule->due_at);
            $daysUntilDue = max(0, (int) $now->diffInDays($dueAt, false));

            $items[] = [
                'card' => $schedule->card,
                'days_until_due' => $daysUntilDue,
            ];
        }

        return [
            'cards' => $items,
            'total' => count($items),
        ];
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

        $schedule = $this->scheduleRepository->findByCardForUser($userId, $cardId);
        if ($schedule === null) {
            throw CardNotFoundException::make($cardId);
        }

        $now = now();
        $previousDueAt = $schedule->due_at;
        $previousSnapshot = [
            'repetitions' => $schedule->repetitions,
            'interval_days' => $schedule->interval_days,
            'ease_factor' => (float) $schedule->ease_factor,
            'stability' => $schedule->stability !== null ? (float) $schedule->stability : null,
            'difficulty' => $schedule->difficulty !== null ? (float) $schedule->difficulty : null,
            'lapse_count' => $schedule->lapse_count,
            'state' => $schedule->state instanceof \BackedEnum
                ? $schedule->state->value
                : (string) $schedule->state,
            'scheduler' => $card->scheduler,
        ];

        $scheduler = $this->schedulerResolver->resolveForCard($card);
        $update = $scheduler->next($schedule, $rating, $now->toDateTime());

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
