<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Repositories\CardReviewRepositoryInterface;
use App\Enums\ReviewRating;
use App\Http\Controllers\Controller;
use App\Http\Requests\Review\AnswerReviewRequest;
use App\Http\Resources\CardResource;
use App\Models\Card;
use App\Models\CardSchedule;
use App\Services\ReviewSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ReviewSessionController extends Controller
{
    public function __construct(
        private readonly ReviewSessionService $sessionService,
        private readonly CardReviewRepositoryInterface $reviewRepository,
    ) {}

    /**
     * 今日の復習対象カード一覧。
     */
    public function today(Request $request): JsonResponse
    {
        $deckId = $request->query('deck_id');
        $deckIdInt = $deckId ? (int) $deckId : null;
        $limit = max(1, min(200, (int) $request->query('limit', '50')));

        $schedules = $this->sessionService->dueCardsForUser(
            userId: $request->user()->id,
            deckId: $deckIdInt,
            limit: $limit,
        );

        $cards = array_values(array_filter(array_map(fn ($s) => $s->card, $schedules)));

        $newCount = 0;
        $reviewCount = 0;
        foreach ($schedules as $schedule) {
            $state = $schedule->state instanceof \BackedEnum
                ? $schedule->state->value
                : (string) $schedule->state;
            if ($state === 'new') {
                $newCount++;
            } else {
                $reviewCount++;
            }
        }

        return response()->json([
            'data' => [
                'total_due' => count($schedules),
                'new_count' => $newCount,
                'review_count' => $reviewCount,
                'cards' => CardResource::collection(collect($cards))->toArray($request),
            ],
        ]);
    }

    /**
     * 追加復習用カード一覧 (due_at が未来のカード)。
     */
    public function extra(Request $request): JsonResponse
    {
        $result = $this->sessionService->extraSession(
            userId: $request->user()->id,
        );

        $cards = [];
        foreach ($result['cards'] as $item) {
            $cardData = CardResource::make($item['card'])->toArray($request);
            $cardData['days_until_due'] = $item['days_until_due'];
            $cards[] = $cardData;
        }

        return response()->json([
            'data' => [
                'total' => $result['total'],
                'cards' => $cards,
            ],
        ]);
    }

    /**
     * 回答を記録し、スケジュールを更新する。
     */
    public function answer(AnswerReviewRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $result = $this->sessionService->recordAnswer(
            userId: $request->user()->id,
            cardId: (int) $validated['card_id'],
            rating: ReviewRating::from($validated['rating']),
            responseTimeMs: isset($validated['response_time_ms'])
                ? (int) $validated['response_time_ms']
                : null,
        );

        /** @var CardSchedule $schedule */
        $schedule = $result['schedule'];
        /** @var Card $card */
        $card = $result['card'];
        $isFsrs = $card->scheduler === Card::SCHEDULER_FSRS;

        return response()->json([
            'data' => [
                'card_id' => (int) $validated['card_id'],
                'rating' => $validated['rating'],
                'scheduler' => $card->scheduler,
                'updated_schedule' => [
                    'state' => $schedule->state instanceof \BackedEnum
                        ? $schedule->state->value
                        : (string) $schedule->state,
                    'repetitions' => $schedule->repetitions,
                    'interval_days' => $schedule->interval_days,
                    // FSRS では ease_factor を使わないので null
                    'ease_factor' => $isFsrs ? null : (float) $schedule->ease_factor,
                    'stability' => $schedule->stability !== null ? (float) $schedule->stability : null,
                    'difficulty' => $schedule->difficulty !== null ? (float) $schedule->difficulty : null,
                    'due_at' => $schedule->due_at?->toIso8601String(),
                    'lapse_count' => $schedule->lapse_count,
                ],
            ],
        ]);
    }

    /**
     * 復習統計。
     */
    public function stats(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $today = [now()->startOfDay(), now()->endOfDay()];
        $week = [now()->startOfWeek(), now()->endOfWeek()];
        $month = [now()->startOfMonth(), now()->endOfMonth()];

        $todayCount = $this->reviewRepository->countForUserInPeriod($userId, $today[0], $today[1]);
        $todayByRating = $this->reviewRepository->countByRatingForUserInPeriod($userId, $today[0], $today[1]);

        $weekCount = $this->reviewRepository->countForUserInPeriod($userId, $week[0], $week[1]);
        $weekByRating = $this->reviewRepository->countByRatingForUserInPeriod($userId, $week[0], $week[1]);

        $monthCount = $this->reviewRepository->countForUserInPeriod($userId, $month[0], $month[1]);

        $totalReviews = $this->reviewRepository->totalCountForUser($userId);
        $byDeck = $this->reviewRepository->statsByDeckForUser($userId);

        $weekAgain = $weekByRating['again'] ?? 0;
        $weekAgainRate = $weekCount > 0 ? round($weekAgain / $weekCount, 3) : 0.0;

        return response()->json([
            'data' => [
                'today' => [
                    'completed_count' => $todayCount,
                    'again_count' => $todayByRating['again'] ?? 0,
                    'hard_count' => $todayByRating['hard'] ?? 0,
                    'good_count' => $todayByRating['good'] ?? 0,
                    'easy_count' => $todayByRating['easy'] ?? 0,
                ],
                'week' => [
                    'completed_count' => $weekCount,
                    'again_rate' => $weekAgainRate,
                ],
                'month' => [
                    'completed_count' => $monthCount,
                ],
                'overall' => [
                    'total_reviews' => $totalReviews,
                ],
                'by_deck' => array_map(fn ($row) => [
                    'deck_id' => $row['deck_id'],
                    'deck_name' => $row['deck_name'],
                    'review_count' => $row['review_count'],
                    'again_count' => $row['again_count'],
                    'again_rate' => $row['review_count'] > 0
                        ? round($row['again_count'] / $row['review_count'], 3)
                        : 0.0,
                ], $byDeck),
            ],
        ]);
    }
}
