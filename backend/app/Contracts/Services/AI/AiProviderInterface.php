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
}
