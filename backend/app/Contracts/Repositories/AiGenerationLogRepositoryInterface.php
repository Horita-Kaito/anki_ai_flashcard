<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\AiGenerationLog;

interface AiGenerationLogRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): AiGenerationLog;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(AiGenerationLog $log, array $attributes): AiGenerationLog;

    /**
     * 指定期間に実行されたユーザーの生成呼び出し回数
     */
    public function countForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): int;

    /**
     * 指定期間のユーザーの累計コスト (USD)
     */
    public function totalCostForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): float;

    /**
     * 指定メモに対して進行中 (queued/processing) のジョブを返す。
     */
    public function findInFlightForNote(int $userId, int $noteSeedId): ?AiGenerationLog;

    /**
     * 指定メモに対する最新ログ (進行中・完了問わず) を返す。
     */
    public function findLatestForNote(int $userId, int $noteSeedId): ?AiGenerationLog;
}
