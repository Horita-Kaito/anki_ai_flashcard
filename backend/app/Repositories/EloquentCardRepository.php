<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Models\Card;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentCardRepository extends AbstractUserScopedEloquentRepository implements CardRepositoryInterface
{
    /** @var array<int, string> */
    private const EAGER_LOADS = ['schedule', 'tags'];

    protected function modelClass(): string
    {
        return Card::class;
    }

    public function findForUser(int $userId, int $cardId): ?Card
    {
        /** @var Card|null */
        return $this->userScopedQuery($userId)
            ->with(self::EAGER_LOADS)
            ->where('id', $cardId)
            ->first();
    }

    public function paginateForUser(int $userId, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $deckId = $filters['deck_id'] ?? null;
        $tagId = $filters['tag_id'] ?? null;
        $keyword = $filters['q'] ?? null;

        return $this->userScopedQuery($userId)
            ->with(self::EAGER_LOADS)
            ->when($deckId !== null, fn ($q) => $q->where('deck_id', $deckId))
            ->when($tagId !== null, fn ($q) => $q->whereHas(
                'tags',
                fn ($tq) => $tq->where('tags.id', $tagId),
            ))
            ->when($keyword !== null && $keyword !== '', function ($q) use ($keyword) {
                $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $keyword);
                $like = '%'.$escaped.'%';
                $q->where(function ($sub) use ($like) {
                    $sub->where('question', 'like', $like)
                        ->orWhere('answer', 'like', $like)
                        ->orWhere('explanation', 'like', $like);
                });
            })
            ->orderByDesc('updated_at')
            ->paginate($perPage)
            ->appends(array_filter([
                'deck_id' => $deckId,
                'tag_id' => $tagId,
                'q' => $keyword,
            ], fn ($v) => $v !== null && $v !== ''));
    }

    public function create(int $userId, array $attributes): Card
    {
        /** @var Card */
        return $this->createOwnedBy($userId, $attributes);
    }

    public function update(Card $card, array $attributes): Card
    {
        $card->update($attributes);

        return $card->refresh()->load(self::EAGER_LOADS);
    }

    public function delete(Card $card): void
    {
        $card->delete();
    }

    public function syncTags(Card $card, array $tagIds): void
    {
        $card->tags()->sync($tagIds);
    }

    public function countForUser(int $userId): int
    {
        return $this->userScopedQuery($userId)->count();
    }

    public function recentForUser(int $userId, int $limit = 5): array
    {
        return $this->userScopedQuery($userId)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->all();
    }
}
