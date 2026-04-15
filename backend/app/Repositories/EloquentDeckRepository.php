<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Models\Deck;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentDeckRepository extends AbstractUserScopedEloquentRepository implements DeckRepositoryInterface
{
    protected function modelClass(): string
    {
        return Deck::class;
    }

    public function findForUser(int $userId, int $deckId): ?Deck
    {
        /** @var Deck|null */
        return $this->userScopedQuery($userId)->where('id', $deckId)->first();
    }

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return $this->userScopedQuery($userId)
            ->orderBy('display_order')
            ->orderByDesc('updated_at')
            ->paginate($perPage);
    }

    public function create(int $userId, array $attributes): Deck
    {
        /** @var Deck */
        return $this->createOwnedBy($userId, $attributes);
    }

    public function update(Deck $deck, array $attributes): Deck
    {
        /** @var Deck */
        return $this->applyUpdate($deck, $attributes);
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
            $this->userScopedQuery($userId)
                ->where('id', $deckId)
                ->update(['display_order' => $position]);
        }
    }
}
