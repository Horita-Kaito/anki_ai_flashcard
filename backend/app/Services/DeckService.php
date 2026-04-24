<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Exceptions\Domain\DeckCycleDetectedException;
use App\Exceptions\Domain\DeckHasChildrenException;
use App\Exceptions\Domain\DeckNotFoundException;
use App\Models\Deck;
use Illuminate\Database\Eloquent\Collection;

final class DeckService
{
    public function __construct(
        private readonly DeckRepositoryInterface $deckRepository,
    ) {}

    /**
     * @throws DeckNotFoundException
     */
    public function getForUser(int $userId, int $deckId): Deck
    {
        $deck = $this->deckRepository->findForUser($userId, $deckId);
        if ($deck === null) {
            throw DeckNotFoundException::make($deckId);
        }

        return $deck;
    }

    /**
     * ユーザー所有デッキを全件取得し、各デッキに path / has_children を付与して返す。
     * デッキ数はユーザー当たり数十〜百程度なので全件返しで十分。
     *
     * @return Collection<int, Deck>
     */
    public function allWithTreeMetaForUser(int $userId): Collection
    {
        $decks = $this->deckRepository->allForUser($userId);

        /** @var array<int, Deck> $byId */
        $byId = [];
        /** @var array<int, int> $childrenCountByParent */
        $childrenCountByParent = [];
        foreach ($decks as $deck) {
            $byId[$deck->id] = $deck;
            $parent = $deck->parent_id;
            if ($parent !== null) {
                $childrenCountByParent[$parent] = ($childrenCountByParent[$parent] ?? 0) + 1;
            }
        }

        foreach ($decks as $deck) {
            $deck->path = $this->buildPath($deck, $byId);
            $deck->children_count = $childrenCountByParent[$deck->id] ?? 0;
        }

        return $decks;
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws DeckCycleDetectedException
     * @throws DeckNotFoundException
     */
    public function createForUser(int $userId, array $attributes): Deck
    {
        if (array_key_exists('parent_id', $attributes) && $attributes['parent_id'] !== null) {
            $this->assertParentOwnedByUser($userId, (int) $attributes['parent_id']);
        }

        return $this->deckRepository->create($userId, $attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws DeckCycleDetectedException
     * @throws DeckNotFoundException
     */
    public function updateForUser(int $userId, int $deckId, array $attributes): Deck
    {
        $deck = $this->getForUser($userId, $deckId);

        if (array_key_exists('parent_id', $attributes)) {
            $newParentId = $attributes['parent_id'] !== null ? (int) $attributes['parent_id'] : null;
            $this->assertNoCycle($userId, $deckId, $newParentId);
        }

        return $this->deckRepository->update($deck, $attributes);
    }

    /**
     * @throws DeckHasChildrenException
     * @throws DeckNotFoundException
     */
    public function deleteForUser(int $userId, int $deckId): void
    {
        $deck = $this->getForUser($userId, $deckId);

        if ($this->deckRepository->hasChildren($userId, $deckId)) {
            throw DeckHasChildrenException::make($deckId);
        }

        $this->deckRepository->delete($deck);
    }

    /**
     * 階層 + 並び順を一括更新する (DnD 後の保存)。
     *
     * @param  array<int, array{id: int, parent_id: ?int, display_order: int}>  $nodes
     *
     * @throws DeckCycleDetectedException
     * @throws DeckNotFoundException
     */
    public function updateTreeForUser(int $userId, array $nodes): void
    {
        // 全 node のユーザー所有確認 + 整合性検証
        $currentDecks = $this->deckRepository->allForUser($userId);
        $ownedIds = $currentDecks->pluck('id')->map(fn ($v) => (int) $v)->all();

        foreach ($nodes as $node) {
            if (! in_array($node['id'], $ownedIds, true)) {
                throw DeckNotFoundException::make($node['id']);
            }
            if ($node['parent_id'] !== null && ! in_array($node['parent_id'], $ownedIds, true)) {
                throw DeckNotFoundException::make($node['parent_id']);
            }
        }

        $this->assertNoCyclesInProposedTree($nodes);

        $this->deckRepository->updateTreeForUser($userId, $nodes);
    }

    /**
     * @param  array<int, Deck>  $byId
     * @return array<int, string>
     */
    private function buildPath(Deck $deck, array $byId): array
    {
        $path = [];
        $current = $deck;
        $safety = 0;
        while ($current !== null && $safety < 100) {
            array_unshift($path, $current->name);
            $parentId = $current->parent_id;
            $current = $parentId !== null ? ($byId[$parentId] ?? null) : null;
            $safety++;
        }

        return $path;
    }

    private function assertParentOwnedByUser(int $userId, int $parentId): void
    {
        if ($this->deckRepository->findForUser($userId, $parentId) === null) {
            throw DeckNotFoundException::make($parentId);
        }
    }

    /**
     * deckId の親を newParentId にする際、循環が生じないかを検証。
     */
    private function assertNoCycle(int $userId, int $deckId, ?int $newParentId): void
    {
        if ($newParentId === null) {
            return;
        }
        if ($newParentId === $deckId) {
            throw DeckCycleDetectedException::selfParent($deckId);
        }
        $this->assertParentOwnedByUser($userId, $newParentId);

        $descendants = $this->deckRepository->descendantIdsFor($userId, $deckId);
        if (in_array($newParentId, $descendants, true)) {
            throw DeckCycleDetectedException::descendantParent($deckId, $newParentId);
        }
    }

    /**
     * 一括更新時、提案された tree に循環や自己参照がないか検証。
     *
     * @param  array<int, array{id: int, parent_id: ?int, display_order: int}>  $nodes
     */
    private function assertNoCyclesInProposedTree(array $nodes): void
    {
        /** @var array<int, ?int> $parentOf */
        $parentOf = [];
        foreach ($nodes as $node) {
            $parentOf[$node['id']] = $node['parent_id'];
        }

        foreach ($nodes as $node) {
            $id = $node['id'];
            if ($node['parent_id'] === $id) {
                throw DeckCycleDetectedException::selfParent($id);
            }
            $visited = [$id => true];
            $current = $node['parent_id'];
            while ($current !== null) {
                if (isset($visited[$current])) {
                    throw DeckCycleDetectedException::descendantParent($id, $current);
                }
                $visited[$current] = true;
                $current = array_key_exists($current, $parentOf) ? $parentOf[$current] : null;
            }
        }
    }
}
