<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class DeckNotFoundException extends ResourceNotFoundException
{
    public static function make(int $deckId): self
    {
        return new self("Deck {$deckId} not found");
    }

    public function userMessage(): string
    {
        return 'デッキが見つかりません';
    }
}
