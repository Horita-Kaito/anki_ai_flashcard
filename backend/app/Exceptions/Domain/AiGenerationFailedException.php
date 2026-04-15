<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiGenerationFailedException extends DomainException
{
    public static function timeout(string $provider): self
    {
        return new self("AI provider {$provider} timed out");
    }

    public static function rateLimit(string $provider): self
    {
        return new self("AI provider {$provider} hit rate limit");
    }

    public static function invalidResponse(string $reason): self
    {
        return new self("AI returned invalid response: {$reason}");
    }

    public static function generic(string $message): self
    {
        return new self($message);
    }

    public function statusCode(): int
    {
        return 502;
    }

    public function userMessage(): string
    {
        return 'AI 生成に失敗しました。時間をおいて再試行してください。';
    }
}
