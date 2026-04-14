<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Models\NoteSeed;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentNoteSeedRepository implements NoteSeedRepositoryInterface
{
    public function findForUser(int $userId, int $noteSeedId): ?NoteSeed
    {
        return NoteSeed::query()
            ->where('user_id', $userId)
            ->where('id', $noteSeedId)
            ->first();
    }

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return NoteSeed::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    public function create(int $userId, array $attributes): NoteSeed
    {
        return NoteSeed::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(NoteSeed $noteSeed, array $attributes): NoteSeed
    {
        $noteSeed->update($attributes);

        return $noteSeed->refresh();
    }

    public function delete(NoteSeed $noteSeed): void
    {
        $noteSeed->delete();
    }
}
