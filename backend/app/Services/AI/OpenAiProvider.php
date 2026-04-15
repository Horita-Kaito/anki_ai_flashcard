<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Exceptions\Domain\AiGenerationFailedException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * OpenAI Chat Completions API 用のプロバイダ実装。
 * response_format=json_object で JSON 出力を強制する。
 */
final class OpenAiProvider implements AiProviderInterface
{
    public function __construct(
        private readonly PricingCalculator $pricing,
        private readonly string $apiKey,
        private readonly string $baseUri,
        private readonly int $timeout,
    ) {}

    public static function fromConfig(): self
    {
        $config = config('ai.providers.openai');

        return new self(
            pricing: PricingCalculator::fromConfig(),
            apiKey: (string) ($config['api_key'] ?? ''),
            baseUri: (string) ($config['base_uri'] ?? 'https://api.openai.com/v1'),
            timeout: (int) ($config['timeout'] ?? 30),
        );
    }

    public function name(): string
    {
        return 'openai';
    }

    public function generate(AiGenerationRequest $request): AiGenerationResult
    {
        if ($this->apiKey === '') {
            throw AiGenerationFailedException::generic(
                'OpenAI API キーが未設定です'
            );
        }

        $startMs = (int) (microtime(true) * 1000);

        try {
            $response = Http::withToken($this->apiKey)
                ->timeout($this->timeout)
                ->baseUrl($this->baseUri)
                ->post('/chat/completions', [
                    'model' => $request->model,
                    'temperature' => $request->temperature,
                    'max_tokens' => $request->maxOutputTokens,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => $request->systemPrompt],
                        ['role' => 'user', 'content' => $request->userPrompt],
                    ],
                ]);
        } catch (ConnectionException $e) {
            throw AiGenerationFailedException::timeout('openai');
        }

        if ($response->status() === 429) {
            throw AiGenerationFailedException::rateLimit('openai');
        }

        if (! $response->successful()) {
            throw AiGenerationFailedException::generic(
                'OpenAI API error: '.$response->status()
            );
        }

        $body = $response->json();
        if (! is_array($body)) {
            throw AiGenerationFailedException::invalidResponse('non-array body');
        }

        $content = $body['choices'][0]['message']['content'] ?? null;
        if (! is_string($content) || $content === '') {
            throw AiGenerationFailedException::invalidResponse('empty content');
        }

        $usage = $body['usage'] ?? [];
        $inputTokens = (int) ($usage['prompt_tokens'] ?? 0);
        $outputTokens = (int) ($usage['completion_tokens'] ?? 0);

        $durationMs = (int) (microtime(true) * 1000) - $startMs;

        return new AiGenerationResult(
            rawContent: $content,
            provider: 'openai',
            model: $request->model,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            costUsd: $this->pricing->calculate('openai', $request->model, $inputTokens, $outputTokens),
            durationMs: $durationMs,
        );
    }
}
