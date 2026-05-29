<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\ChatCardizationBatchRepositoryInterface;
use App\Exceptions\Domain\ChatCardizationBatchNotFoundException;
use App\Models\ChatCardizationBatch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class ChatCardizationBatchService
{
    public function __construct(
        private readonly ChatCardizationBatchRepositoryInterface $batchRepository,
    ) {}

    /** @return LengthAwarePaginator<int, ChatCardizationBatch> */
    public function paginateForUser(int $userId, int $perPage = 10): LengthAwarePaginator
    {
        return $this->batchRepository->paginateForUser($userId, $perPage);
    }

    public function getForUser(int $userId, int $batchId): ChatCardizationBatch
    {
        $batch = $this->batchRepository->findForUserWithNotes($userId, $batchId);
        if ($batch === null) {
            throw ChatCardizationBatchNotFoundException::make($batchId);
        }

        return $batch;
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<int, array{note_seed_id: int, ai_generation_log_id?: int|null, generation_status: string, failure_reason?: string|null}>  $noteRows
     */
    public function createForUser(int $userId, array $attributes, array $noteRows): ChatCardizationBatch
    {
        return $this->batchRepository->createWithNotes($userId, $attributes, $noteRows);
    }
}
