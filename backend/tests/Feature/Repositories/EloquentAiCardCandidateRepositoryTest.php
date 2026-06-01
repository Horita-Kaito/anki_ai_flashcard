<?php

declare(strict_types=1);

namespace Tests\Feature\Repositories;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Models\NoteSeed;
use App\Models\User;
use App\Services\AI\CandidateQualityValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class EloquentAiCardCandidateRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_db一意制約に衝突するactive候補は保存をスキップする(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();
        $repository = app(AiCardCandidateRepositoryInterface::class);
        $fingerprint = app(CandidateQualityValidator::class)->fingerprint('DI とは何ですか？');
        $attributes = [
            'note_seed_id' => $note->id,
            'provider' => 'fake',
            'model_name' => 'fake-model',
            'question' => 'DI とは何ですか？',
            'question_fingerprint' => $fingerprint,
            'answer' => '依存性注入です',
            'card_type' => 'basic_qa',
            'status' => 'pending',
        ];

        $repository->create($user->id, $attributes);
        $duplicate = $repository->createIfActiveQuestionUnique($user->id, [
            ...$attributes,
            'question' => ' DIとは何ですか? ',
        ]);

        $this->assertNull($duplicate);
        $this->assertDatabaseCount('ai_card_candidates', 1);
    }
}
