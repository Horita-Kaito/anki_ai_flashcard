<?php

declare(strict_types=1);

namespace App\Services\AI;

/**
 * config/ai.php の pricing 表からコストを計算する。
 * 未登録モデルは 0 (警告対象)。
 */
final class PricingCalculator
{
    /**
     * @param  array<string, array<string, array{input: float, output: float}>>  $pricingTable
     */
    public function __construct(
        private readonly array $pricingTable,
    ) {}

    public static function fromConfig(): self
    {
        return new self(config('ai.pricing', []));
    }

    public function calculate(
        string $provider,
        string $model,
        int $inputTokens,
        int $outputTokens,
    ): float {
        $rates = $this->pricingTable[$provider][$model] ?? null;
        if ($rates === null) {
            return 0.0;
        }

        $inputCost = ($inputTokens / 1_000_000) * $rates['input'];
        $outputCost = ($outputTokens / 1_000_000) * $rates['output'];

        return round($inputCost + $outputCost, 6);
    }
}
