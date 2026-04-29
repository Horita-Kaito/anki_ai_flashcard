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
}
