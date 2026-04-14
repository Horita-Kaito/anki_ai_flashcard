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

    public function paginateForUser(int $userId, ?int $deckId, int $perPage = 20): LengthAwarePaginator
    {
        return Card::query()
            ->with(['schedule', 'tags'])
            ->where('user_id', $userId)
            ->when($deckId !== null, fn ($q) => $q->where('deck_id', $deckId))
            ->orderByDesc('updated_at')
            ->paginate($perPage);
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
