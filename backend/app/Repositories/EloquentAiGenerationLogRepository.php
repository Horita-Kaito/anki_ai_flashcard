<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Models\AiGenerationLog;
use Illuminate\Database\Eloquent\Collection;

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

    public function sumTokensForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): int
    {
        $row = AiGenerationLog::query()
            ->where('user_id', $userId)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('COALESCE(SUM(input_tokens), 0) + COALESCE(SUM(output_tokens), 0) AS total_tokens')
            ->first();

        return (int) ($row?->total_tokens ?? 0);
    }

    public function findInFlightForNote(int $userId, int $noteSeedId): ?AiGenerationLog
    {
        // 子 chunk ログは UI から隠す: parent_log_id IS NULL のもの (= 単発 or 親) のみ返す。
        // children は AiGenerationStatusResource で chunks_completed / chunks_failed を集計する
        // 際に参照するため eager load しておく (3 秒間隔の polling で N+1 を避ける目的)。
        return AiGenerationLog::query()
            ->with('children:id,parent_log_id,status,candidates_count')
            ->where('user_id', $userId)
            ->where('note_seed_id', $noteSeedId)
            ->whereNull('parent_log_id')
            ->whereIn('status', AiGenerationLog::inFlightStatuses())
            ->orderByDesc('id')
            ->first();
    }

    public function findLatestForNote(int $userId, int $noteSeedId): ?AiGenerationLog
    {
        return AiGenerationLog::query()
            ->with('children:id,parent_log_id,status,candidates_count')
            ->where('user_id', $userId)
            ->where('note_seed_id', $noteSeedId)
            ->whereNull('parent_log_id')
            ->orderByDesc('id')
            ->first();
    }

    public function findForUpdate(int $id): ?AiGenerationLog
    {
        return AiGenerationLog::query()
            ->whereKey($id)
            ->lockForUpdate()
            ->first();
    }

    public function listChildrenForParent(int $parentId): Collection
    {
        return AiGenerationLog::query()
            ->where('parent_log_id', $parentId)
            ->orderBy('id')
            ->get();
    }
}
