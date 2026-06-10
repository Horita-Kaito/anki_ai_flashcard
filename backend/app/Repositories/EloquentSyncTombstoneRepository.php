<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\SyncTombstoneRepositoryInterface;
use App\Models\SyncTombstone;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

final class EloquentSyncTombstoneRepository extends AbstractUserScopedEloquentRepository implements SyncTombstoneRepositoryInterface
{
    protected function modelClass(): string
    {
        return SyncTombstone::class;
    }

    public function findForUser(int $userId, string $entity, string $clientId): ?SyncTombstone
    {
        /** @var SyncTombstone|null */
        return $this->userScopedQuery($userId)
            ->where('entity', $entity)
            ->where('client_id', $clientId)
            ->first();
    }

    public function upsert(int $userId, string $entity, string $clientId, CarbonInterface $clientUpdatedAt): SyncTombstone
    {
        /** @var SyncTombstone */
        return SyncTombstone::query()->updateOrCreate(
            ['user_id' => $userId, 'entity' => $entity, 'client_id' => $clientId],
            ['client_updated_at' => $clientUpdatedAt],
        );
    }

    public function deleteForUser(int $userId, string $entity, string $clientId): void
    {
        $this->userScopedQuery($userId)
            ->where('entity', $entity)
            ->where('client_id', $clientId)
            ->delete();
    }

    public function pullForUser(int $userId, ?CarbonInterface $since, int $limit): Collection
    {
        /** @var Collection<int, SyncTombstone> */
        return $this->userScopedQuery($userId)
            ->when($since !== null, fn ($q) => $q->where('updated_at', '>', $since))
            ->orderBy('updated_at')
            ->limit($limit)
            ->get();
    }
}
