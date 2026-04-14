<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\NoteSeed;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface NoteSeedRepositoryInterface
{
    public function findForUser(int $userId, int $noteSeedId): ?NoteSeed;

    /**
     * @param  array{domain_template_id?: int, q?: string}  $filters
     * @return LengthAwarePaginator<int, NoteSeed>
     */
    public function paginateForUser(int $userId, array $filters = [], int $perPage = 20): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): NoteSeed;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(NoteSeed $noteSeed, array $attributes): NoteSeed;

    public function delete(NoteSeed $noteSeed): void;

    /** @return array<int, NoteSeed> */
    public function recentForUser(int $userId, int $limit = 5): array;
}
