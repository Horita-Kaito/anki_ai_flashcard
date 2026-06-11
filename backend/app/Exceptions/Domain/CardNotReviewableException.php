<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class CardNotReviewableException extends DomainException
{
    public static function archived(int $cardId): self
    {
        return new self(
            "カード(id={$cardId})はアーカイブ済みのため復習を記録できません。"
            .'復習を再開するには先にアーカイブを解除してください。'
        );
    }

    public static function suspended(int $cardId): self
    {
        return new self(
            "カード(id={$cardId})は保留中のため復習を記録できません。"
            .'復習を再開するには先に保留を解除してください。'
        );
    }

    public function statusCode(): int
    {
        return 409;
    }

    public function errorCode(): ?string
    {
        return 'CARD_NOT_REVIEWABLE';
    }
}
