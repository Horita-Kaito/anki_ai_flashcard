<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Enums\ScheduleState;
use App\Models\Card;
use App\Models\CardSchedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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

    public function decayOverdueForUser(int $userId, \DateTimeInterface $now): void
    {
        $nowCarbon = Carbon::instance($now);
        $cutoff1 = $nowCarbon->copy()->subDay();
        $cutoff7 = $nowCarbon->copy()->subDays(7);
        $cutoff14 = $nowCarbon->copy()->subDays(14);

        // SM-2 カードに限定: FSRS は interval_days が stability から導出されるため
        // ここで上書きしても次レビューで再計算されるだけで意味がない。
        // sm2 のみを対象とすることで、interval_days と stability の一時的乖離を防ぐ。
        $smCardSubquery = Card::query()
            ->where('user_id', $userId)
            ->where('scheduler', Card::SCHEDULER_SM2)
            ->select('id');

        // overdue > 14 日: interval を 1 にリセット
        CardSchedule::query()
            ->where('user_id', $userId)
            ->whereIn('card_id', $smCardSubquery)
            ->whereNull('archived_at')
            ->where('interval_days', '>', 0)
            ->where('due_at', '<', $cutoff14)
            ->update(['interval_days' => 1]);

        // 7 < overdue <= 14: interval *= 0.5 (最低 1)
        CardSchedule::query()
            ->where('user_id', $userId)
            ->whereIn('card_id', $smCardSubquery)
            ->whereNull('archived_at')
            ->where('interval_days', '>', 0)
            ->where('due_at', '<', $cutoff7)
            ->where('due_at', '>=', $cutoff14)
            ->update([
                'interval_days' => DB::raw(
                    'CASE WHEN FLOOR(interval_days * 0.5) < 1 THEN 1 ELSE FLOOR(interval_days * 0.5) END'
                ),
            ]);

        // 1 < overdue <= 7: interval *= 0.8 (最低 1)
        CardSchedule::query()
            ->where('user_id', $userId)
            ->whereIn('card_id', $smCardSubquery)
            ->whereNull('archived_at')
            ->where('interval_days', '>', 0)
            ->where('due_at', '<', $cutoff1)
            ->where('due_at', '>=', $cutoff7)
            ->update([
                'interval_days' => DB::raw(
                    'CASE WHEN FLOOR(interval_days * 0.8) < 1 THEN 1 ELSE FLOOR(interval_days * 0.8) END'
                ),
            ]);
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
