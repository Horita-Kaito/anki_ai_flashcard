<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\ChatCardizationBatchRepositoryInterface;
use App\Models\ChatCardizationBatch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class EloquentChatCardizationBatchRepository extends AbstractUserScopedEloquentRepository implements ChatCardizationBatchRepositoryInterface
{
    protected function modelClass(): string
    {
        return ChatCardizationBatch::class;
    }

    public function paginateForUser(int $userId, int $perPage = 10): LengthAwarePaginator
    {
        return $this->userScopedQuery($userId)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function findForUserWithNotes(int $userId, int $batchId): ?ChatCardizationBatch
    {
        /** @var ChatCardizationBatch|null */
        return $this->userScopedQuery($userId)
            ->with('noteSeeds')
            ->where('id', $batchId)
            ->first();
    }

    public function createWithNotes(int $userId, array $attributes, array $noteRows): ChatCardizationBatch
    {
        return DB::transaction(function () use ($userId, $attributes, $noteRows): ChatCardizationBatch {
            /** @var ChatCardizationBatch $batch */
            $batch = $this->createOwnedBy($userId, $attributes);

            foreach ($noteRows as $row) {
                $batch->noteSeeds()->attach($row['note_seed_id'], [
                    'user_id' => $userId,
                    'ai_generation_log_id' => $row['ai_generation_log_id'] ?? null,
                    'generation_status' => $row['generation_status'],
                    'failure_reason' => $row['failure_reason'] ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $batch->load('noteSeeds');
        });
    }
}
