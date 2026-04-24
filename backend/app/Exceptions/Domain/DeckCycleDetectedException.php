<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class DeckCycleDetectedException extends DomainException
{
    public static function selfParent(int $deckId): self
    {
        return new self("デッキ(id={$deckId})を自身の親に指定することはできません。");
    }

    public static function descendantParent(int $deckId, int $parentId): self
    {
        return new self(
            "デッキ(id={$deckId})の子孫デッキ(id={$parentId})を親に指定することはできません。"
            .'親子関係が循環するため不可です。'
        );
    }

    public function statusCode(): int
    {
        return 422;
    }
}
