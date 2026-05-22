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
    /** generate() が同一 instance に対して何回呼ばれたかを追跡する。 */
    private int $callCount = 0;

    /**
     * @param  array<int, array<string, mixed>>|null  $candidates
     * @param  int  $failFirstCalls  最初の N 回だけ throwable / forceRawContent によるフォールバック挙動を取り、
     *                               それ以降は通常応答を返す (0 なら毎回フォールバック挙動)。
     *                               リトライテストで「最初は失敗、リトライで成功」を表現するのに使う。
     */
    public function __construct(
        private readonly PricingCalculator $pricing,
        private readonly ?array $candidates = null,
        private readonly int $inputTokens = 900,
        private readonly int $outputTokens = 300,
        private readonly ?string $forceRawContent = null,
        private readonly ?\Throwable $throwable = null,
        private readonly int $failFirstCalls = 0,
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
        int $failFirstCalls = 0,
    ): self {
        return new self(
            pricing: PricingCalculator::fromConfig(),
            candidates: $candidates,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            forceRawContent: $forceRawContent,
            throwable: $throwable,
            failFirstCalls: $failFirstCalls,
        );
    }

    public function name(): string
    {
        return 'fake';
    }

    public function generate(AiGenerationRequest $request): AiGenerationResult
    {
        $this->callCount++;

        // failFirstCalls=0: 設定された throwable / forceRawContent を毎回適用 (旧来の挙動)
        // failFirstCalls>0: 最初の N 回だけフォールバック挙動、N+1 回目以降は通常応答 (リトライテスト用)
        $applyFallback = $this->failFirstCalls === 0
            || $this->callCount <= $this->failFirstCalls;

        if ($applyFallback && $this->throwable !== null) {
            throw $this->throwable;
        }

        $raw = $applyFallback && $this->forceRawContent !== null
            ? $this->forceRawContent
            : $this->buildDefaultJson();
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
