<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;

interface TagRepositoryInterface
{
    public function findForUser(int $userId, int $tagId): ?Tag;

    public function findByNameForUser(int $userId, string $name): ?Tag;

    /** @return Collection<int, Tag> */
    public function listForUser(int $userId): Collection;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): Tag;

    public function delete(Tag $tag): void;

    /**
     * 指定された tag_id 群がすべて user に属するか
     *
     * @param  array<int, int>  $tagIds
     */
    public function allBelongToUser(int $userId, array $tagIds): bool;
}
