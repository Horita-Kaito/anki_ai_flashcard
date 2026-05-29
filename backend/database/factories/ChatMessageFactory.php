<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChatMessage>
 */
final class ChatMessageFactory extends Factory
{
    protected $model = ChatMessage::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'chat_session_id' => ChatSession::factory(),
            'role' => $this->faker->randomElement(['user', 'assistant']),
            'content' => $this->faker->paragraph(),
            'metadata' => null,
        ];
    }
}
