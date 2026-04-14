<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class CardNotFoundException extends ResourceNotFoundException
{
    public static function make(int $cardId): self
    {
        return new self("Card {$cardId} not found");
    }

    public function userMessage(): string
    {
        return 'カードが見つかりません';
    }
}
