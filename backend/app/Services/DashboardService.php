<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Contracts\Repositories\NoteSeedRepositoryInterface;

final class DashboardService
{
    public function __construct(
        private readonly CardRepositoryInterface $cardRepository,
        private readonly CardScheduleRepositoryInterface $scheduleRepository,
        private readonly NoteSeedRepositoryInterface $noteSeedRepository,
    ) {}

    /**
     * @return array{
     *   due_count_today: int,
     *   new_cards_count: int,
     *   total_cards: int,
     *   recent_notes: array<int, \App\Models\NoteSeed>,
     *   recent_cards: array<int, \App\Models\Card>,
     * }
     */
    public function summaryForUser(int $userId): array
    {
        return [
            'due_count_today' => $this->scheduleRepository->dueCountForUser($userId, now()),
            'new_cards_count' => $this->scheduleRepository->newCountForUser($userId),
            'total_cards' => $this->cardRepository->countForUser($userId),
            'recent_notes' => $this->noteSeedRepository->recentForUser($userId, 5),
            'recent_cards' => $this->cardRepository->recentForUser($userId, 5),
        ];
    }
}
