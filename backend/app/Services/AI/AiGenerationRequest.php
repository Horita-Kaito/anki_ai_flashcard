<?php

declare(strict_types=1);

namespace App\Services\AI;

/**
 * AI プロバイダへのリクエストを表す DTO。
 * プロバイダ非依存の抽象リクエスト。
 */
final class AiGenerationRequest
{
    public function __construct(
        public readonly string $systemPrompt,
        public readonly string $userPrompt,
        public readonly string $model,
        public readonly float $temperature = 0.6,
        public readonly int $maxOutputTokens = 2000,
    ) {}
}
