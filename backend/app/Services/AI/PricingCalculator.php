<?php

declare(strict_types=1);

namespace App\Services\AI;

use Illuminate\Support\Facades\Log;

/**
 * config/ai.php の pricing 表からコストを計算する。
 * 未登録モデルは 0 (警告対象)。
 */
final class PricingCalculator
{
    /** @var array<string, true> 同一 provider/model の警告を 1 回だけ出すための記録 */
    private array $warnedKeys = [];

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
            $key = "{$provider}/{$model}";
            if (! isset($this->warnedKeys[$key])) {
                $this->warnedKeys[$key] = true;
                // Log Facade が未初期化な Unit Test 環境でも落ちないようにする
                try {
                    Log::warning('AI pricing 未登録のため 0 USD として計上', [
                        'provider' => $provider,
                        'model' => $model,
                        'input_tokens' => $inputTokens,
                        'output_tokens' => $outputTokens,
                    ]);
                } catch (\RuntimeException) {
                    // facade root not set (pure PHPUnit unit test) は無視
                }
            }

            return 0.0;
        }

        $inputCost = ($inputTokens / 1_000_000) * $rates['input'];
        $outputCost = ($outputTokens / 1_000_000) * $rates['output'];

        return round($inputCost + $outputCost, 6);
    }
}
