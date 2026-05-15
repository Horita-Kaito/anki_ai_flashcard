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
            'domain_hint' => 'テスト用の分野ヒント (1 行)',
        ];
    }
}
