<?php

declare(strict_types=1);

namespace Tests\Feature\Integration\AI;

use App\Exceptions\Domain\AiGenerationFailedException;
use App\Services\AI\AiGenerationRequest;
use App\Services\AI\OpenAiProvider;
use App\Services\AI\PricingCalculator;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class OpenAiProviderTest extends TestCase
{
    private function makeProvider(): OpenAiProvider
    {
        return new OpenAiProvider(
            pricing: PricingCalculator::fromConfig(),
            apiKey: 'test-key',
            baseUri: 'https://api.openai.com/v1',
            timeout: 30,
        );
    }

    private function makeRequest(): AiGenerationRequest
    {
        return new AiGenerationRequest(
            systemPrompt: 'system',
            userPrompt: 'user',
            model: 'gpt-4o-mini',
            temperature: 0.6,
            maxOutputTokens: 2000,
        );
    }

    public function test_成功応答からusageとコンテンツを取り出す(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => '{"candidates":[]}']],
                ],
                'usage' => [
                    'prompt_tokens' => 900,
                    'completion_tokens' => 300,
                ],
            ], 200),
        ]);

        $result = $this->makeProvider()->generate($this->makeRequest());

        $this->assertSame('{"candidates":[]}', $result->rawContent);
        $this->assertSame('openai', $result->provider);
        $this->assertSame(900, $result->inputTokens);
        $this->assertSame(300, $result->outputTokens);
        $this->assertEqualsWithDelta(0.000315, $result->costUsd, 0.0000001);
    }

    public function test_429でrate_limit例外(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response([], 429),
        ]);

        $this->expectException(AiGenerationFailedException::class);
        $this->makeProvider()->generate($this->makeRequest());
    }

    public function test_500でgeneric例外(): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response(['error' => 'x'], 500),
        ]);

        $this->expectException(AiGenerationFailedException::class);
        $this->makeProvider()->generate($this->makeRequest());
    }

    public function test_api_key未設定で例外(): void
    {
        $provider = new OpenAiProvider(
            pricing: PricingCalculator::fromConfig(),
            apiKey: '',
            baseUri: 'https://api.openai.com/v1',
            timeout: 30,
        );

        $this->expectException(AiGenerationFailedException::class);
        $provider->generate($this->makeRequest());
    }
}
