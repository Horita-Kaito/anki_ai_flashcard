<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Card;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CardRepositoryInterface
{
    public function findForUser(int $userId, int $cardId): ?Card;

    /** @return LengthAwarePaginator<int, Card> */
    public function paginateForUser(int $userId, ?int $deckId, int $perPage = 20): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): Card;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Card $card, array $attributes): Card;

    public function delete(Card $card): void;

    /**
     * @param  array<int, int>  $tagIds
     */
    public function syncTags(Card $card, array $tagIds): void;
}
