<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

/**
 * リソースが見つからない時の汎用例外。
 * 具体的なリソースごとに継承して使ってもよい (DeckNotFoundException 等)。
 */
class ResourceNotFoundException extends DomainException
{
    public function statusCode(): int
    {
        return 404;
    }
}
