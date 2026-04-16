<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Exceptions\Domain\AiGenerationFailedException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

final class GoogleAiProvider implements AiProviderInterface
{
    public function __construct(
        private readonly PricingCalculator $pricing,
        private readonly string $apiKey,
        private readonly string $baseUri,
        private readonly int $timeout,
    ) {}

    public static function fromConfig(): self
    {
        $config = config('ai.providers.google');

        return new self(
            pricing: PricingCalculator::fromConfig(),
            apiKey: (string) ($config['api_key'] ?? ''),
            baseUri: (string) ($config['base_uri'] ?? 'https://generativelanguage.googleapis.com/v1beta'),
            timeout: (int) ($config['timeout'] ?? 30),
        );
    }

    public function name(): string
    {
        return 'google';
    }

    public function generate(AiGenerationRequest $request): AiGenerationResult
    {
        if ($this->apiKey === '') {
            throw AiGenerationFailedException::generic(
                'Google AI API キーが未設定です'
            );
        }

        $startMs = (int) (microtime(true) * 1000);

        $url = sprintf(
            '%s/models/%s:generateContent?key=%s',
            rtrim($this->baseUri, '/'),
            $request->model,
            $this->apiKey,
        );

        try {
            $response = Http::timeout($this->timeout)
                ->post($url, [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                ['text' => $request->systemPrompt . "\n\n" . $request->userPrompt],
                            ],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => $request->temperature,
                        'maxOutputTokens' => $request->maxOutputTokens,
                        'responseMimeType' => 'application/json',
                    ],
                ]);
        } catch (ConnectionException $e) {
            throw AiGenerationFailedException::timeout('google');
        }

        if ($response->status() === 429) {
            throw AiGenerationFailedException::rateLimit('google');
        }

        if (! $response->successful()) {
            throw AiGenerationFailedException::generic(
                'Google AI API error: ' . $response->status()
            );
        }

        $body = $response->json();
        if (! is_array($body)) {
            throw AiGenerationFailedException::invalidResponse('non-array body');
        }

        $content = $body['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (! is_string($content) || $content === '') {
            throw AiGenerationFailedException::invalidResponse('empty content');
        }

        $usage = $body['usageMetadata'] ?? [];
        $inputTokens = (int) ($usage['promptTokenCount'] ?? 0);
        $outputTokens = (int) ($usage['candidatesTokenCount'] ?? 0);

        $durationMs = (int) (microtime(true) * 1000) - $startMs;

        return new AiGenerationResult(
            rawContent: $content,
            provider: 'google',
            model: $request->model,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            costUsd: $this->pricing->calculate('google', $request->model, $inputTokens, $outputTokens),
            durationMs: $durationMs,
        );
    }
}
