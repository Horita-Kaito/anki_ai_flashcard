<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class NoteSeedNotFoundException extends ResourceNotFoundException
{
    protected function label(): string
    {
        return 'メモ';
    }
}
