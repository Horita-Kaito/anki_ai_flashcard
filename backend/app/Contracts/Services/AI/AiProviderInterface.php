<?php

declare(strict_types=1);

namespace App\Contracts\Services\AI;

use App\Exceptions\Domain\AiGenerationFailedException;
use App\Services\AI\AiGenerationRequest;
use App\Services\AI\AiGenerationResult;

interface AiProviderInterface
{
    /**
     * プロバイダ名 ('openai', 'anthropic', 'google', 'fake')
     */
    public function name(): string;

    /**
     * AI 生成を実行する。
     * 失敗時は AiGenerationFailedException を投げる。
     *
     * @throws AiGenerationFailedException
     */
    public function generate(AiGenerationRequest $request): AiGenerationResult;

    /**
     * このプロバイダが strict JSON Schema による構造化出力 (response_format=json_schema 相当) を
     * サポートするか。true ならば呼び出し側は AiGenerationRequest::$jsonSchema を組み立てて渡せる。
     *
     * 現状は OpenAI (gpt-4o 系) のみ true、Anthropic / Google / Fake は false。
     */
    public function supportsJsonSchema(): bool;
}
