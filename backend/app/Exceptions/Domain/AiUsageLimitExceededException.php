<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiUsageLimitExceededException extends DomainException
{
    public static function monthlyTokenLimit(int $limitTokens, int $usedTokens): self
    {
        return new self("Monthly AI token limit reached (used={$usedTokens}, limit={$limitTokens})");
    }

    public function statusCode(): int
    {
        return 429;
    }

    public function errorCode(): ?string
    {
        return 'MONTHLY_TOKEN_LIMIT_EXCEEDED';
    }

    public function userMessage(): string
    {
        return '今月の AI 利用上限に達しました。来月再度お試しください。';
    }
}
