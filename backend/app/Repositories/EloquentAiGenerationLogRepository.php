<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Models\AiGenerationLog;

final class EloquentAiGenerationLogRepository implements AiGenerationLogRepositoryInterface
{
    public function create(array $attributes): AiGenerationLog
    {
        return AiGenerationLog::create($attributes);
    }

    public function update(AiGenerationLog $log, array $attributes): AiGenerationLog
    {
        $log->update($attributes);

        return $log->refresh();
    }

    public function countForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): int
    {
        return AiGenerationLog::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$from, $to])
            ->count();
    }

    public function totalCostForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): float
    {
        return (float) AiGenerationLog::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$from, $to])
            ->sum('cost_usd');
    }

    public function findInFlightForNote(int $userId, int $noteSeedId): ?AiGenerationLog
    {
        return AiGenerationLog::query()
            ->where('user_id', $userId)
            ->where('note_seed_id', $noteSeedId)
            ->whereIn('status', AiGenerationLog::inFlightStatuses())
            ->orderByDesc('id')
            ->first();
    }

    public function findLatestForNote(int $userId, int $noteSeedId): ?AiGenerationLog
    {
        return AiGenerationLog::query()
            ->where('user_id', $userId)
            ->where('note_seed_id', $noteSeedId)
            ->orderByDesc('id')
            ->first();
    }
}
