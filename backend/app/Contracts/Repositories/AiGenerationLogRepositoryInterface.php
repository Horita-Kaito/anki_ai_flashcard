<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\AiGenerationLog;
use Illuminate\Database\Eloquent\Collection;

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
     * 指定期間のユーザーの累計トークン使用量 (input + output)。
     * 月次の利用上限チェックに使用する。
     */
    public function sumTokensForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): int;

    /**
     * 指定メモに対して進行中 (queued/processing) のジョブを返す。
     */
    public function findInFlightForNote(int $userId, int $noteSeedId): ?AiGenerationLog;

    /**
     * 指定メモに対する最新ログ (進行中・完了問わず) を返す。
     */
    public function findLatestForNote(int $userId, int $noteSeedId): ?AiGenerationLog;

    /**
     * 行ロック付きで 1 件取得する。親ログの集約更新時に、並列の子 Job が同じ親を
     * 同時に書き換える race を防ぐ目的でトランザクション内から呼ぶ。
     */
    public function findForUpdate(int $id): ?AiGenerationLog;

    /**
     * 親ログに属する子ログを全件返す。集約用の単純な順序を保つため id 昇順で返す。
     *
     * @return Collection<int, AiGenerationLog>
     */
    public function listChildrenForParent(int $parentId): Collection;
}
