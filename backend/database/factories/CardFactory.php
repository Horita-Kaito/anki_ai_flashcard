<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Card;
use App\Models\Deck;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Card>
 */
final class CardFactory extends Factory
{
    protected $model = Card::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'deck_id' => Deck::factory(),
            'question' => $this->faker->sentence().'?',
            'answer' => $this->faker->sentence(),
            'card_type' => 'basic_qa',
            'is_suspended' => false,
        ];
    }
}
