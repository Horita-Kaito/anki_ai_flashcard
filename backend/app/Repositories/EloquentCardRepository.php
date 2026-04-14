<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Models\Card;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentCardRepository implements CardRepositoryInterface
{
    public function findForUser(int $userId, int $cardId): ?Card
    {
        return Card::query()
            ->with(['schedule', 'tags'])
            ->where('user_id', $userId)
            ->where('id', $cardId)
            ->first();
    }

    public function paginateForUser(int $userId, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $deckId = $filters['deck_id'] ?? null;
        $tagId = $filters['tag_id'] ?? null;
        $keyword = $filters['q'] ?? null;

        return Card::query()
            ->with(['schedule', 'tags'])
            ->where('user_id', $userId)
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
        return Card::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(Card $card, array $attributes): Card
    {
        $card->update($attributes);

        return $card->refresh()->load(['schedule', 'tags']);
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
        return Card::query()->where('user_id', $userId)->count();
    }

    public function recentForUser(int $userId, int $limit = 5): array
    {
        return Card::query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->all();
    }
}
