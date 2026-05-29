<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\ChatCardizationBatch;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ChatCardizationBatchRepositoryInterface
{
    /** @return LengthAwarePaginator<int, ChatCardizationBatch> */
    public function paginateForUser(int $userId, int $perPage = 10): LengthAwarePaginator;

    public function findForUserWithNotes(int $userId, int $batchId): ?ChatCardizationBatch;

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<int, array{note_seed_id: int, ai_generation_log_id?: int|null, generation_status: string, failure_reason?: string|null}>  $noteRows
     */
    public function createWithNotes(int $userId, array $attributes, array $noteRows): ChatCardizationBatch;
}
