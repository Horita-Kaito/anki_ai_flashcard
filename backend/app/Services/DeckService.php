<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Exceptions\Domain\DeckNotFoundException;
use App\Models\Deck;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

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

    /** @return LengthAwarePaginator<int, Deck> */
    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return $this->deckRepository->paginateForUser($userId, $perPage);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createForUser(int $userId, array $attributes): Deck
    {
        return $this->deckRepository->create($userId, $attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws DeckNotFoundException
     */
    public function updateForUser(int $userId, int $deckId, array $attributes): Deck
    {
        $deck = $this->getForUser($userId, $deckId);

        return $this->deckRepository->update($deck, $attributes);
    }

    /**
     * @throws DeckNotFoundException
     */
    public function deleteForUser(int $userId, int $deckId): void
    {
        $deck = $this->getForUser($userId, $deckId);
        $this->deckRepository->delete($deck);
    }

    /**
     * @param  array<int, int>  $orderedIds
     */
    public function reorderForUser(int $userId, array $orderedIds): void
    {
        $this->deckRepository->reorderForUser($userId, $orderedIds);
    }
}
