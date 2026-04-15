<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

use App\Services\AI\PricingCalculator;
use PHPUnit\Framework\TestCase;

final class PricingCalculatorTest extends TestCase
{
    public function test_gpt_4o_miniのコスト計算(): void
    {
        $calc = new PricingCalculator([
            'openai' => [
                'gpt-4o-mini' => ['input' => 0.15, 'output' => 0.60],
            ],
        ]);

        // 900 input + 300 output tokens
        // input: 900 / 1_000_000 * 0.15 = 0.000135
        // output: 300 / 1_000_000 * 0.60 = 0.000180
        // total: 0.000315
        $cost = $calc->calculate('openai', 'gpt-4o-mini', 900, 300);
        $this->assertEqualsWithDelta(0.000315, $cost, 0.0000001);
    }

    public function test_未登録モデルは0を返す(): void
    {
        $calc = new PricingCalculator([]);
        $this->assertSame(0.0, $calc->calculate('unknown', 'unknown-model', 1000, 500));
    }

    public function test_大量トークンでも計算できる(): void
    {
        $calc = new PricingCalculator([
            'anthropic' => [
                'claude-opus-4' => ['input' => 15.00, 'output' => 75.00],
            ],
        ]);

        // 1M input + 1M output
        $cost = $calc->calculate('anthropic', 'claude-opus-4', 1_000_000, 1_000_000);
        $this->assertEqualsWithDelta(90.0, $cost, 0.0001);
    }
}
