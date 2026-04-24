<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class DeckHasChildrenException extends DomainException
{
    public static function make(int $deckId): self
    {
        return new self(
            "デッキ(id={$deckId})は子デッキが残っているため削除できません。"
            .'先に子デッキを別の親デッキへ移動するか、個別に削除してください。'
        );
    }

    public function statusCode(): int
    {
        return 409;
    }
}
