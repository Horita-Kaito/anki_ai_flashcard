<?php

declare(strict_types=1);

namespace App\Services\AI;

/**
 * AI プロバイダへのリクエストを表す DTO。
 * プロバイダ非依存の抽象リクエスト。
 */
final class AiGenerationRequest
{
    /**
     * @param  array<string, mixed>|null  $jsonSchema  OpenAI の response_format=json_schema 用の strict スキーマ。
     *                                                 指定すると AI は構造違反のレスポンスを返せなくなる。
     *                                                 他プロバイダはこのフィールドを無視してよい。
     */
    public function __construct(
        public readonly string $systemPrompt,
        public readonly string $userPrompt,
        public readonly string $model,
        public readonly float $temperature = 0.6,
        public readonly int $maxOutputTokens = 2000,
        public readonly ?array $jsonSchema = null,
    ) {}
}
