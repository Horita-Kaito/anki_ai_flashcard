<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NoteSeed>
 */
final class NoteSeedFactory extends Factory
{
    protected $model = NoteSeed::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'body' => $this->faker->sentence(10),
            'domain_template_id' => null,
            'subdomain' => $this->faker->optional()->word(),
            'learning_goal' => $this->faker->optional()->sentence(),
            'note_context' => null,
        ];
    }
}
