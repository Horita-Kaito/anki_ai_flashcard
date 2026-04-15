<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AiCardCandidate;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiCardCandidate>
 */
final class AiCardCandidateFactory extends Factory
{
    protected $model = AiCardCandidate::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'note_seed_id' => NoteSeed::factory(),
            'provider' => 'fake',
            'model_name' => 'gpt-4o-mini',
            'question' => $this->faker->sentence().'?',
            'answer' => $this->faker->sentence(),
            'card_type' => 'basic_qa',
            'focus_type' => 'definition',
            'rationale' => $this->faker->sentence(),
            'confidence' => 0.85,
            'status' => 'pending',
            'raw_response' => null,
        ];
    }
}
