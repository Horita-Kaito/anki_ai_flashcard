<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiUsageLimitExceededException extends DomainException
{
    public static function dailyLimit(int $limit): self
    {
        return new self("Daily AI generation limit reached ({$limit})");
    }

    public function statusCode(): int
    {
        return 429;
    }

    public function userMessage(): string
    {
        return '本日の AI 生成上限に達しました。明日再度お試しください。';
    }
}
