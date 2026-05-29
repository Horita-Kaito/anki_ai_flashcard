<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ChatSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChatSession>
 */
final class ChatSessionFactory extends Factory
{
    protected $model = ChatSession::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => $this->faker->sentence(4),
            'domain_template_id' => null,
            'deck_id' => null,
        ];
    }
}
