<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Enums\ScheduleState;
use App\Models\Card;
use App\Models\CardSchedule;

final class EloquentCardScheduleRepository implements CardScheduleRepositoryInterface
{
    public function createInitial(Card $card): CardSchedule
    {
        return CardSchedule::create([
            'user_id' => $card->user_id,
            'card_id' => $card->id,
            'repetitions' => 0,
            'interval_days' => 0,
            'ease_factor' => 2.50,
            'due_at' => now(),
            'lapse_count' => 0,
            'state' => ScheduleState::New->value,
        ]);
    }

    public function findByCard(int $cardId): ?CardSchedule
    {
        return CardSchedule::query()->where('card_id', $cardId)->first();
    }

    public function dueCountForUser(int $userId, \DateTimeInterface $before): int
    {
        return CardSchedule::query()
            ->where('user_id', $userId)
            ->where('due_at', '<=', $before)
            ->count();
    }

    public function newCountForUser(int $userId): int
    {
        return CardSchedule::query()
            ->where('user_id', $userId)
            ->where('state', ScheduleState::New->value)
            ->count();
    }
}
