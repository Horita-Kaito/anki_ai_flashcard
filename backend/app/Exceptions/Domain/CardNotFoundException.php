<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class CardNotFoundException extends ResourceNotFoundException
{
    protected function label(): string
    {
        return 'カード';
    }
}
