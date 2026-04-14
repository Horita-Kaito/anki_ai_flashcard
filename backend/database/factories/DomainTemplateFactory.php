<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\DomainTemplate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DomainTemplate>
 */
final class DomainTemplateFactory extends Factory
{
    protected $model = DomainTemplate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->words(2, true),
            'description' => $this->faker->optional()->sentence(),
            'instruction_json' => [
                'goal' => 'テスト用の学習目的',
                'priorities' => ['定義を問う', 'なぜ必要かを問う'],
                'avoid' => ['長文回答を求める問い'],
                'preferred_card_types' => ['basic_qa'],
                'answer_style' => '1-2文で簡潔に',
                'difficulty_policy' => '初学者向け',
                'note_interpretation_policy' => 'メモにない内容を過剰に補完しない',
            ],
        ];
    }
}
