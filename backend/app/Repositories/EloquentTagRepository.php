<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\TagRepositoryInterface;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;

final class EloquentTagRepository implements TagRepositoryInterface
{
    public function findForUser(int $userId, int $tagId): ?Tag
    {
        return Tag::query()
            ->where('user_id', $userId)
            ->where('id', $tagId)
            ->first();
    }

    public function findByNameForUser(int $userId, string $name): ?Tag
    {
        return Tag::query()
            ->where('user_id', $userId)
            ->where('name', $name)
            ->first();
    }

    public function listForUser(int $userId): Collection
    {
        return Tag::query()
            ->where('user_id', $userId)
            ->orderBy('name')
            ->get();
    }

    public function create(int $userId, array $attributes): Tag
    {
        return Tag::create([...$attributes, 'user_id' => $userId]);
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

        return Tag::query()
            ->where('user_id', $userId)
            ->whereIn('id', $tagIds)
            ->count() === count(array_unique($tagIds));
    }
}
