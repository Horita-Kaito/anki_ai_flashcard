<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Exceptions\Domain\AiGenerationFailedException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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

    private const FALLBACK_MODELS = [
        'gemini-2.5-flash-lite',
        'gemini-2.5-pro',
    ];

    public function generate(AiGenerationRequest $request): AiGenerationResult
    {
        if ($this->apiKey === '') {
            throw AiGenerationFailedException::generic(
                'Google AI API キーが未設定です'
            );
        }

        $models = [$request->model, ...array_diff(self::FALLBACK_MODELS, [$request->model])];

        $lastException = null;
        foreach ($models as $model) {
            try {
                return $this->callApi($request, $model);
            } catch (AiGenerationFailedException $e) {
                if (! str_contains($e->getMessage(), '503') && ! str_contains($e->getMessage(), '404')) {
                    throw $e;
                }
                $lastException = $e;
                Log::warning("Google AI model {$model} returned 503, trying fallback");
            }
        }

        throw $lastException ?? AiGenerationFailedException::generic('Google AI: all models unavailable');
    }

    private function callApi(AiGenerationRequest $request, string $model): AiGenerationResult
    {
        $startMs = (int) (microtime(true) * 1000);

        $url = sprintf(
            '%s/models/%s:generateContent?key=%s',
            rtrim($this->baseUri, '/'),
            $model,
            $this->apiKey,
        );

        try {
            $response = Http::timeout($this->timeout)
                ->post($url, [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [
                                ['text' => $request->systemPrompt."\n\n".$request->userPrompt],
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
                'Google AI API error: '.$response->status()
            );
        }

        $body = $response->json();
        if (! is_array($body)) {
            throw AiGenerationFailedException::invalidResponse('non-array body');
        }

        // 入力プロンプト自体がブロックされた場合 (candidates が空)
        $blockReason = $body['promptFeedback']['blockReason'] ?? null;
        if (is_string($blockReason) && $blockReason !== '') {
            throw AiGenerationFailedException::safetyBlocked(
                "promptFeedback.blockReason={$blockReason}",
            );
        }

        $candidate = $body['candidates'][0] ?? null;
        if (! is_array($candidate)) {
            throw AiGenerationFailedException::invalidResponse(
                'no candidates',
                'response body had no candidates[0]',
            );
        }

        // 応答が安全フィルタや MAX_TOKENS で打ち切られた場合
        $finishReason = $candidate['finishReason'] ?? null;
        $content = $candidate['content']['parts'][0]['text'] ?? null;

        if ($finishReason === 'SAFETY' || $finishReason === 'RECITATION' || $finishReason === 'PROHIBITED_CONTENT') {
            throw AiGenerationFailedException::safetyBlocked(
                "finishReason={$finishReason}",
            );
        }

        if ($finishReason === 'MAX_TOKENS' && (! is_string($content) || $content === '')) {
            // 出力 0 で MAX_TOKENS になるケース (ほぼ思考トークンで埋まった等)
            throw AiGenerationFailedException::maxTokens();
        }

        if (! is_string($content) || $content === '') {
            throw AiGenerationFailedException::invalidResponse(
                'empty content',
                "finishReason={$finishReason}",
            );
        }

        // MAX_TOKENS でもコンテンツがあれば downstream の CandidateParser で
        // 部分リカバリさせる (truncated=true で記録される)。

        $usage = $body['usageMetadata'] ?? [];
        $inputTokens = (int) ($usage['promptTokenCount'] ?? 0);
        $outputTokens = (int) ($usage['candidatesTokenCount'] ?? 0);

        $durationMs = (int) (microtime(true) * 1000) - $startMs;

        return new AiGenerationResult(
            rawContent: $content,
            provider: 'google',
            model: $model,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            costUsd: $this->pricing->calculate('google', $model, $inputTokens, $outputTokens),
            durationMs: $durationMs,
        );
    }
}
