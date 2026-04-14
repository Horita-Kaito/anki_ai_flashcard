<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Deck;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface DeckRepositoryInterface
{
    public function findForUser(int $userId, int $deckId): ?Deck;

    /** @return LengthAwarePaginator<int, Deck> */
    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): Deck;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Deck $deck, array $attributes): Deck;

    public function delete(Deck $deck): void;
}
