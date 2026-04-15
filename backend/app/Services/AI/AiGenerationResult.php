<?php

declare(strict_types=1);

namespace App\Services\AI;

/**
 * AI プロバイダからの応答結果。
 * 具象コンテンツ + 使用量メトリクス。
 */
final class AiGenerationResult
{
    public function __construct(
        public readonly string $rawContent,
        public readonly string $provider,
        public readonly string $model,
        public readonly int $inputTokens,
        public readonly int $outputTokens,
        public readonly float $costUsd,
        public readonly int $durationMs,
    ) {}
}
