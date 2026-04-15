<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\TagRepositoryInterface;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;

final class EloquentTagRepository extends AbstractUserScopedEloquentRepository implements TagRepositoryInterface
{
    protected function modelClass(): string
    {
        return Tag::class;
    }

    public function findForUser(int $userId, int $tagId): ?Tag
    {
        /** @var Tag|null */
        return $this->userScopedQuery($userId)->where('id', $tagId)->first();
    }

    public function findByNameForUser(int $userId, string $name): ?Tag
    {
        /** @var Tag|null */
        return $this->userScopedQuery($userId)->where('name', $name)->first();
    }

    public function listForUser(int $userId): Collection
    {
        /** @var Collection<int, Tag> */
        return $this->userScopedQuery($userId)
            ->orderBy('name')
            ->get();
    }

    public function create(int $userId, array $attributes): Tag
    {
        /** @var Tag */
        return $this->createOwnedBy($userId, $attributes);
    }

    public function delete(Tag $tag): void
    {
        $tag->delete();
    }

    public function allBelongToUser(int $userId, array $tagIds): bool
    {
        if ($tagIds === []) {
            return true;
        }

        return $this->userScopedQuery($userId)
            ->whereIn('id', $tagIds)
            ->count() === count(array_unique($tagIds));
    }
}
