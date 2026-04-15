<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class DeckNotFoundException extends ResourceNotFoundException
{
    protected function label(): string
    {
        return 'デッキ';
    }
}
