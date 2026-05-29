<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ChatCardizationBatch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChatCardizationBatch>
 */
final class ChatCardizationBatchFactory extends Factory
{
    protected $model = ChatCardizationBatch::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'source_chat_session_id' => null,
            'source_chat_session_title' => $this->faker->sentence(3),
            'domain_template_id' => null,
            'deck_id' => null,
            'notes_count' => 0,
            'dispatched_count' => 0,
            'failed_count' => 0,
            'status' => ChatCardizationBatch::STATUS_COMPLETED,
        ];
    }
}
