<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\SyncTombstone;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * 同期削除墓標 (sync_tombstones) の永続化アクセス。
 * 同期は (user_id, entity, client_id) を安定キーとして扱う。
 */
interface SyncTombstoneRepositoryInterface
{
    public function findForUser(int $userId, string $entity, string $clientId): ?SyncTombstone;

    /**
     * 墓標を upsert する（削除受信時）。client_updated_at は LWW 比較に使う論理時刻。
     */
    public function upsert(int $userId, string $entity, string $clientId, CarbonInterface $clientUpdatedAt): SyncTombstone;

    public function deleteForUser(int $userId, string $entity, string $clientId): void;

    /**
     * since 以降に更新された墓標を pull する。$since が null なら全件。
     *
     * @return Collection<int, SyncTombstone>
     */
    public function pullForUser(int $userId, ?CarbonInterface $since, int $limit): Collection;
}
