<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Models\Card;
use App\Models\NoteSeed;

final class DashboardService
{
    public function __construct(
        private readonly CardRepositoryInterface $cardRepository,
        private readonly CardScheduleRepositoryInterface $scheduleRepository,
        private readonly NoteSeedRepositoryInterface $noteSeedRepository,
        private readonly AiGenerationLogRepositoryInterface $aiLogRepository,
        private readonly StreakService $streakService,
    ) {}

    /**
     * @return array{
     *   due_count_today: int,
     *   new_cards_count: int,
     *   total_cards: int,
     *   recent_notes: array<int, NoteSeed>,
     *   recent_cards: array<int, Card>,
     *   ai_usage: array{
     *     today_calls: int,
     *     month_calls: int,
     *     month_cost_usd: float,
     *   },
     *   streak: array{current: int, longest: int, today_done: bool},
     * }
     */
    public function summaryForUser(int $userId): array
    {
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();
        $dayStart = now()->startOfDay();
        $dayEnd = now()->endOfDay();

        return [
            'due_count_today' => $this->scheduleRepository->dueCountForUser($userId, now()),
            'new_cards_count' => $this->scheduleRepository->newCountForUser($userId),
            'total_cards' => $this->cardRepository->countForUser($userId),
            'recent_notes' => $this->noteSeedRepository->recentForUser($userId, 5),
            'recent_cards' => $this->cardRepository->recentForUser($userId, 5),
            'ai_usage' => [
                'today_calls' => $this->aiLogRepository->countForUserInPeriod($userId, $dayStart, $dayEnd),
                'month_calls' => $this->aiLogRepository->countForUserInPeriod($userId, $monthStart, $monthEnd),
                'month_cost_usd' => $this->aiLogRepository->totalCostForUserInPeriod($userId, $monthStart, $monthEnd),
            ],
            'streak' => $this->streakService->summaryForUser($userId),
        ];
    }
}
