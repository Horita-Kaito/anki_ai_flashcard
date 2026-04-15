<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Models\Deck;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentDeckRepository implements DeckRepositoryInterface
{
    public function findForUser(int $userId, int $deckId): ?Deck
    {
        return Deck::query()
            ->where('user_id', $userId)
            ->where('id', $deckId)
            ->first();
    }

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return Deck::query()
            ->where('user_id', $userId)
            ->orderBy('display_order')
            ->orderByDesc('updated_at')
            ->paginate($perPage);
    }

    public function create(int $userId, array $attributes): Deck
    {
        return Deck::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(Deck $deck, array $attributes): Deck
    {
        $deck->update($attributes);

        return $deck->refresh();
    }

    public function delete(Deck $deck): void
    {
        $deck->delete();
    }

    /**
     * 並び順を一括更新する。
     *
     * @param  array<int, int>  $orderedIds  先頭から順に並べた deck_id 配列
     */
    public function reorderForUser(int $userId, array $orderedIds): void
    {
        foreach ($orderedIds as $position => $deckId) {
            Deck::query()
                ->where('user_id', $userId)
                ->where('id', $deckId)
                ->update(['display_order' => $position]);
        }
    }
}
