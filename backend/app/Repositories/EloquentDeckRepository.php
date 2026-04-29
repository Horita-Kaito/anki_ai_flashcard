<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Models\Deck;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

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

    public function allForUser(int $userId): Collection
    {
        /** @var Collection<int, Deck> */
        return $this->userScopedQuery($userId)
            ->orderBy('parent_id')
            ->orderBy('display_order')
            ->orderBy('id')
            ->get();
    }

    public function idsAndNamesForUser(int $userId): array
    {
        return $this->userScopedQuery($userId)
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get()
            ->map(fn (Deck $d) => ['id' => (int) $d->id, 'name' => (string) $d->name])
            ->all();
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
     * BFS で子孫を収集。sqlite (メモリ DB) テスト環境では再帰 CTE の
     * 挙動差異が出やすいため、ユーザー所有デッキを 1 クエリで取得してから
     * PHP 側で親子関係を辿る (デッキ数はユーザー当たり数十〜百程度で十分軽い)。
     *
     * @return array<int, int>
     */
    public function descendantIdsFor(int $userId, int $deckId): array
    {
        $rows = $this->userScopedQuery($userId)
            ->select(['id', 'parent_id'])
            ->get();

        /** @var array<int, array<int, int>> $childrenByParent */
        $childrenByParent = [];
        foreach ($rows as $row) {
            $parent = $row->parent_id;
            if ($parent === null) {
                continue;
            }
            $childrenByParent[$parent][] = $row->id;
        }

        $result = [];
        $stack = $childrenByParent[$deckId] ?? [];
        while ($stack !== []) {
            $id = array_pop($stack);
            $result[] = $id;
            if (isset($childrenByParent[$id])) {
                foreach ($childrenByParent[$id] as $childId) {
                    $stack[] = $childId;
                }
            }
        }

        return $result;
    }

    public function hasChildren(int $userId, int $deckId): bool
    {
        return $this->userScopedQuery($userId)
            ->where('parent_id', $deckId)
            ->exists();
    }

    public function updateTreeForUser(int $userId, array $nodes): void
    {
        DB::transaction(function () use ($userId, $nodes): void {
            foreach ($nodes as $node) {
                $this->userScopedQuery($userId)
                    ->where('id', $node['id'])
                    ->update([
                        'parent_id' => $node['parent_id'],
                        'display_order' => $node['display_order'],
                    ]);
            }
        });
    }
}
