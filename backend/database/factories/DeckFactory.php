<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Deck;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deck>
 */
final class DeckFactory extends Factory
{
    protected $model = Deck::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'parent_id' => null,
            'name' => $this->faker->words(2, true),
            'description' => $this->faker->optional()->sentence(),
            'default_domain_template_id' => null,
            'display_order' => 0,
        ];
    }
}
