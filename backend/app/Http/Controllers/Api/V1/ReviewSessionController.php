<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Repositories\CardReviewRepositoryInterface;
use App\Enums\ReviewRating;
use App\Http\Controllers\Controller;
use App\Http\Requests\Review\AnswerReviewRequest;
use App\Http\Resources\CardResource;
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

        /** @var \App\Models\CardSchedule $schedule */
        $schedule = $result['schedule'];

        return response()->json([
            'data' => [
                'card_id' => (int) $validated['card_id'],
                'rating' => $validated['rating'],
                'updated_schedule' => [
                    'state' => $schedule->state instanceof \BackedEnum
                        ? $schedule->state->value
                        : (string) $schedule->state,
                    'repetitions' => $schedule->repetitions,
                    'interval_days' => $schedule->interval_days,
                    'ease_factor' => (float) $schedule->ease_factor,
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

        $todayCount = $this->reviewRepository->countForUserInPeriod($userId, $today[0], $today[1]);
        $todayByRating = $this->reviewRepository->countByRatingForUserInPeriod($userId, $today[0], $today[1]);
        $totalReviews = $this->reviewRepository->totalCountForUser($userId);

        return response()->json([
            'data' => [
                'today' => [
                    'completed_count' => $todayCount,
                    'again_count' => $todayByRating['again'] ?? 0,
                    'hard_count' => $todayByRating['hard'] ?? 0,
                    'good_count' => $todayByRating['good'] ?? 0,
                    'easy_count' => $todayByRating['easy'] ?? 0,
                ],
                'overall' => [
                    'total_reviews' => $totalReviews,
                ],
            ],
        ]);
    }
}
