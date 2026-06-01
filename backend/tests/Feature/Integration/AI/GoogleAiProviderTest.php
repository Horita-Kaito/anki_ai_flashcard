<?php

declare(strict_types=1);

namespace Tests\Feature\Integration\AI;

use App\Services\AI\AiGenerationRequest;
use App\Services\AI\CandidateJsonSchema;
use App\Services\AI\GoogleAiProvider;
use App\Services\AI\PricingCalculator;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class GoogleAiProviderTest extends TestCase
{
    public function test_json_schemaをgemini_response_schema形式で渡す(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [['text' => '{"candidates":[]}']]],
                    'finishReason' => 'STOP',
                ]],
                'usageMetadata' => [
                    'promptTokenCount' => 10,
                    'candidatesTokenCount' => 5,
                ],
            ]),
        ]);

        $provider = new GoogleAiProvider(
            pricing: PricingCalculator::fromConfig(),
            apiKey: 'test-key',
            baseUri: 'https://generativelanguage.googleapis.com/v1beta',
            timeout: 30,
        );

        $this->assertTrue($provider->supportsJsonSchema());

        $provider->generate(new AiGenerationRequest(
            systemPrompt: 'system',
            userPrompt: 'user',
            model: 'gemini-2.5-flash',
            temperature: 0.6,
            maxOutputTokens: 2000,
            jsonSchema: CandidateJsonSchema::forOpenAi(),
        ));

        Http::assertSent(function ($request): bool {
            $schema = $request->data()['generationConfig']['responseSchema'];
            $item = $schema['properties']['candidates']['items'];

            return $schema['type'] === 'object'
                && ! isset($schema['additionalProperties'])
                && $item['properties']['explanation']['type'] === 'string'
                && $item['properties']['explanation']['nullable'] === true;
        });
    }
}
