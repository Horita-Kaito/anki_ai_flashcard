<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\TagRepositoryInterface;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;

final class TagService
{
    public function __construct(
        private readonly TagRepositoryInterface $tagRepository,
    ) {}

    /** @return Collection<int, Tag> */
    public function listForUser(int $userId): Collection
    {
        return $this->tagRepository->listForUser($userId);
    }

    /**
     * 既存の同名タグがあれば返し、無ければ作成する (upsert 的な振る舞い)。
     */
    public function findOrCreateForUser(int $userId, string $name): Tag
    {
        $existing = $this->tagRepository->findByNameForUser($userId, $name);
        if ($existing !== null) {
            return $existing;
        }

        return $this->tagRepository->create($userId, ['name' => $name]);
    }

    public function deleteForUser(int $userId, int $tagId): void
    {
        $tag = $this->tagRepository->findForUser($userId, $tagId);
        if ($tag === null) {
            return;
        }
        $this->tagRepository->delete($tag);
    }
}
