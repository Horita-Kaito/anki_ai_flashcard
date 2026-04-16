<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Services\AI\AiProviderInterface;

/**
 * テスト用の AI プロバイダ。
 * 固定の JSON 応答を返す。実プロバイダと同様に PricingCalculator で
 * コストを計算するので、コスト記録のテストにも使える。
 *
 * 応答内容や例外挙動は make() で差し替え可能。
 */
final class FakeAiProvider implements AiProviderInterface
{
    /**
     * @param  array<int, array<string, mixed>>|null  $candidates
     */
    public function __construct(
        private readonly PricingCalculator $pricing,
        private readonly ?array $candidates = null,
        private readonly int $inputTokens = 900,
        private readonly int $outputTokens = 300,
        private readonly ?string $forceRawContent = null,
        private readonly ?\Throwable $throwable = null,
    ) {}

    /**
     * テスト用ファクトリ。
     *
     * @param  array<int, array<string, mixed>>|null  $candidates
     */
    public static function make(
        ?array $candidates = null,
        int $inputTokens = 900,
        int $outputTokens = 300,
        ?string $forceRawContent = null,
        ?\Throwable $throwable = null,
    ): self {
        return new self(
            pricing: PricingCalculator::fromConfig(),
            candidates: $candidates,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            forceRawContent: $forceRawContent,
            throwable: $throwable,
        );
    }

    public function name(): string
    {
        return 'fake';
    }

    public function generate(AiGenerationRequest $request): AiGenerationResult
    {
        if ($this->throwable !== null) {
            throw $this->throwable;
        }

        $raw = $this->forceRawContent ?? $this->buildDefaultJson();
        $inputRate = 0.15;
        $outputRate = 0.60;
        $cost = ($this->inputTokens * $inputRate / 1_000_000)
              + ($this->outputTokens * $outputRate / 1_000_000);

        return new AiGenerationResult(
            rawContent: $raw,
            provider: 'fake',
            model: $request->model,
            inputTokens: $this->inputTokens,
            outputTokens: $this->outputTokens,
            costUsd: $cost,
            durationMs: 10,
        );
    }

    private function buildDefaultJson(): string
    {
        $candidates = $this->candidates ?? [
            [
                'question' => 'これは何を問う問題ですか',
                'answer' => 'サンプル回答 1',
                'card_type' => 'basic_qa',
                'focus_type' => 'definition',
                'rationale' => 'テスト用に生成',
                'confidence' => 0.9,
            ],
            [
                'question' => '次に重要な観点は何ですか',
                'answer' => 'サンプル回答 2',
                'card_type' => 'basic_qa',
                'focus_type' => 'purpose',
                'rationale' => 'テスト用',
                'confidence' => 0.8,
            ],
            [
                'question' => '比較すべき点は何ですか',
                'answer' => 'サンプル回答 3',
                'card_type' => 'comparison',
                'focus_type' => 'comparison',
                'rationale' => 'テスト用',
                'confidence' => 0.75,
            ],
        ];

        return json_encode(['candidates' => $candidates], JSON_UNESCAPED_UNICODE);
    }
}
