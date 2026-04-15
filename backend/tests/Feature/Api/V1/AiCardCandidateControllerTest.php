<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Models\AiCardCandidate;
use App\Models\Deck;
use App\Models\DomainTemplate;
use App\Models\NoteSeed;
use App\Models\User;
use App\Services\AI\AiGenerationRequest;
use App\Services\AI\AiGenerationResult;
use App\Services\AI\FakeAiProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AiCardCandidateControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // FakeAiProvider をデフォルトで使用
        $this->app->bind(AiProviderInterface::class, fn () => FakeAiProvider::make());
    }

    public function test_未認証では401(): void
    {
        $note = NoteSeed::factory()->for(User::factory())->create();
        $this->postJson("/api/v1/note-seeds/{$note->id}/generate-candidates")
            ->assertUnauthorized();
    }

    public function test_メモから候補を生成できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create([
            'body' => 'DIは依存を外から渡すことで差し替えやすくなる',
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/note-seeds/{$note->id}/generate-candidates", [
                'count' => 3,
            ]);

        $response->assertCreated()->assertJsonCount(3, 'data');

        $this->assertDatabaseCount('ai_card_candidates', 3);
        $this->assertDatabaseCount('ai_generation_logs', 1);
        $this->assertDatabaseHas('ai_generation_logs', [
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'status' => 'success',
            'candidates_count' => 3,
        ]);
    }

    public function test_生成ログにコストが記録される(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/note-seeds/{$note->id}/generate-candidates")
            ->assertCreated();

        $log = \App\Models\AiGenerationLog::first();
        $this->assertNotNull($log);
        $this->assertGreaterThan(0, $log->input_tokens);
        $this->assertGreaterThan(0, $log->output_tokens);
        // 900 input + 300 output @ gpt-4o-mini ($0.15 / $0.60 per 1M)
        // = 0.000135 + 0.000180 = 0.000315
        $this->assertEqualsWithDelta(0.000315, (float) $log->cost_usd, 0.0000001);
    }

    public function test_他ユーザーのメモでは生成できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $note = NoteSeed::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson("/api/v1/note-seeds/{$note->id}/generate-candidates")
            ->assertNotFound();
    }

    public function test_AIが不正なJSONを返すと失敗ログのみ残る(): void
    {
        $this->app->bind(
            AiProviderInterface::class,
            fn () => FakeAiProvider::make(forceRawContent: 'not json at all')
        );

        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson("/api/v1/note-seeds/{$note->id}/generate-candidates")
            ->assertStatus(502);

        // 候補は作成されない
        $this->assertDatabaseCount('ai_card_candidates', 0);
        // ログは失敗ステータスで残る
        $this->assertDatabaseHas('ai_generation_logs', [
            'user_id' => $user->id,
            'status' => 'failed',
        ]);
    }

    public function test_候補一覧を取得できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();
        AiCardCandidate::factory()->count(2)->state([
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'provider' => 'fake',
            'model_name' => 'gpt-4o-mini',
        ])->create();

        $this->actingAs($user)
            ->getJson("/api/v1/note-seeds/{$note->id}/candidates")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_候補を編集できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();
        $candidate = AiCardCandidate::factory()->state([
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'question' => 'before',
        ])->create();

        $this->actingAs($user)
            ->putJson("/api/v1/ai-card-candidates/{$candidate->id}", [
                'question' => 'after',
            ])
            ->assertOk()
            ->assertJsonPath('data.question', 'after');
    }

    public function test_候補を却下できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();
        $candidate = AiCardCandidate::factory()->state([
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
        ])->create();

        $this->actingAs($user)
            ->postJson("/api/v1/ai-card-candidates/{$candidate->id}/reject")
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');
    }

    public function test_候補を採用してカード化できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();
        $candidate = AiCardCandidate::factory()->state([
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'question' => 'DIとは',
            'answer' => '依存性注入',
            'card_type' => 'basic_qa',
        ])->create();

        $response = $this->actingAs($user)
            ->postJson("/api/v1/ai-card-candidates/{$candidate->id}/adopt", [
                'deck_id' => $deck->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.source_ai_candidate_id', $candidate->id)
            ->assertJsonPath('data.schedule.state', 'new');

        $this->assertDatabaseHas('ai_card_candidates', [
            'id' => $candidate->id,
            'status' => 'adopted',
        ]);
    }

    public function test_他ユーザーのデッキには採用できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $otherDeck = Deck::factory()->for($other)->create();
        $note = NoteSeed::factory()->for($me)->create();
        $candidate = AiCardCandidate::factory()->state([
            'user_id' => $me->id,
            'note_seed_id' => $note->id,
        ])->create();

        $this->actingAs($me)
            ->postJson("/api/v1/ai-card-candidates/{$candidate->id}/adopt", [
                'deck_id' => $otherDeck->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['deck_id']);
    }

    public function test_再生成でpending候補がrejectedになる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();
        AiCardCandidate::factory()->count(3)->state([
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'status' => 'pending',
        ])->create();

        $this->actingAs($user)
            ->postJson("/api/v1/note-seeds/{$note->id}/regenerate-candidates")
            ->assertCreated();

        // 元の3件 → rejected、新しい 3件 → pending
        $this->assertSame(3, AiCardCandidate::where('status', 'rejected')->count());
        $this->assertSame(3, AiCardCandidate::where('status', 'pending')->count());
    }

    public function test_複数候補を一括採用できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $note = NoteSeed::factory()->for($user)->create();
        $candidates = AiCardCandidate::factory()->count(3)->state([
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'status' => 'pending',
        ])->create();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/ai-card-candidates/batch-adopt', [
                'deck_id' => $deck->id,
                'candidate_ids' => $candidates->pluck('id')->all(),
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.adopted_count', 3);

        foreach ($candidates as $c) {
            $this->assertDatabaseHas('ai_card_candidates', [
                'id' => $c->id,
                'status' => 'adopted',
            ]);
        }
        $this->assertDatabaseCount('cards', 3);
    }

    public function test_他ユーザーの候補idは一括採用で弾かれる(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $deck = Deck::factory()->for($me)->create();
        $note = NoteSeed::factory()->for($other)->create();
        $otherCandidate = AiCardCandidate::factory()->state([
            'user_id' => $other->id,
            'note_seed_id' => $note->id,
        ])->create();

        $this->actingAs($me)
            ->postJson('/api/v1/ai-card-candidates/batch-adopt', [
                'deck_id' => $deck->id,
                'candidate_ids' => [$otherCandidate->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['candidate_ids.0']);
    }
}
