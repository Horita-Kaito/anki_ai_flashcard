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
            ->whereNull('archived_at')
            ->count();
    }

    public function newCountForUser(int $userId): int
    {
        return CardSchedule::query()
            ->where('user_id', $userId)
            ->where('state', ScheduleState::New->value)
            ->whereNull('archived_at')
            ->count();
    }

    public function dueCardsForUser(int $userId, \DateTimeInterface $before, ?array $deckIds, int $limit): array
    {
        return CardSchedule::query()
            ->with(['card.tags'])
            ->where('user_id', $userId)
            ->where('due_at', '<=', $before)
            ->whereNull('archived_at')
            ->when($deckIds !== null && $deckIds !== [], fn ($q) => $q->whereHas(
                'card',
                fn ($cq) => $cq->whereIn('deck_id', $deckIds),
            ))
            ->whereHas('card', fn ($cq) => $cq->where('is_suspended', false))
            ->orderBy('due_at')
            ->limit($limit)
            ->get()
            ->all();
    }

    public function update(CardSchedule $schedule, array $attributes): CardSchedule
    {
        $schedule->update($attributes);

        return $schedule->refresh();
    }

    public function overdueCardsForUser(int $userId, \DateTimeInterface $before): array
    {
        return CardSchedule::query()
            ->where('user_id', $userId)
            ->where('due_at', '<=', $before)
            ->whereNull('archived_at')
            ->where('interval_days', '>', 0)
            ->get()
            ->all();
    }

    public function archive(CardSchedule $schedule): CardSchedule
    {
        $schedule->update(['archived_at' => now()]);

        return $schedule->refresh();
    }

    public function unarchive(CardSchedule $schedule, int $resetIntervalDays): CardSchedule
    {
        $schedule->update([
            'archived_at' => null,
            'interval_days' => $resetIntervalDays,
            'due_at' => now(),
        ]);

        return $schedule->refresh();
    }

    public function findByCardForUser(int $userId, int $cardId): ?CardSchedule
    {
        return CardSchedule::query()
            ->where('user_id', $userId)
            ->where('card_id', $cardId)
            ->first();
    }

    public function extraCardsForUser(int $userId, int $limit = 10): array
    {
        return CardSchedule::query()
            ->with(['card.tags'])
            ->where('user_id', $userId)
            ->where('due_at', '>', now())
            ->whereNull('archived_at')
            ->whereHas('card', fn ($cq) => $cq->where('is_suspended', false))
            ->orderBy('due_at')
            ->limit($limit)
            ->get()
            ->all();
    }
}
