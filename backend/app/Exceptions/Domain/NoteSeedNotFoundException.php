<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class NoteSeedNotFoundException extends ResourceNotFoundException
{
    public static function make(int $noteSeedId): self
    {
        return new self("NoteSeed {$noteSeedId} not found");
    }

    public function userMessage(): string
    {
        return 'メモが見つかりません';
    }
}
