<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Deck;
use Illuminate\Database\Eloquent\Collection;

interface DeckRepositoryInterface
{
    public function findForUser(int $userId, int $deckId): ?Deck;

    /**
     * ユーザー所有デッキを全件取得。階層構造は parent_id/display_order から組み立てる。
     *
     * @return Collection<int, Deck>
     */
    public function allForUser(int $userId): Collection;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): Deck;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Deck $deck, array $attributes): Deck;

    public function delete(Deck $deck): void;

    /**
     * 指定デッキの子孫デッキ ID (自身は含まない) を返す。
     *
     * @return array<int, int>
     */
    public function descendantIdsFor(int $userId, int $deckId): array;

    /**
     * 指定デッキが子デッキを持つか判定。
     */
    public function hasChildren(int $userId, int $deckId): bool;

    /**
     * parent_id + display_order を一括更新する。
     * 全 node のトランザクション内で適用する想定 (呼出側で transaction を張る)。
     *
     * @param  array<int, array{id: int, parent_id: ?int, display_order: int}>  $nodes
     */
    public function updateTreeForUser(int $userId, array $nodes): void;
}
