<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Mcp\Servers\TesseraServer;
use App\Mcp\Tools\AdoptCardCandidateTool;
use App\Models\AiCardCandidate;
use App\Models\Deck;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AdoptCardCandidateToolTest extends TestCase
{
    use RefreshDatabase;

    private function makeCandidate(User $user): AiCardCandidate
    {
        return AiCardCandidate::factory()
            ->for($user)
            ->for(NoteSeed::factory()->for($user))
            ->create();
    }

    public function test_候補を採用するとカードと初期スケジュールが作成される(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $candidate = $this->makeCandidate($user);

        TesseraServer::actingAs($user)->tool(AdoptCardCandidateTool::class, [
            'candidate_id' => $candidate->id,
            'deck_id' => $deck->id,
        ])->assertOk();

        $this->assertDatabaseHas('cards', [
            'user_id' => $user->id,
            'deck_id' => $deck->id,
            'question' => $candidate->question,
            'source_ai_candidate_id' => $candidate->id,
        ]);
        $this->assertDatabaseCount('card_schedules', 1);
        $this->assertDatabaseHas('ai_card_candidates', [
            'id' => $candidate->id,
            'status' => 'adopted',
        ]);
    }

    public function test_質問と回答を編集して採用できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $candidate = $this->makeCandidate($user);

        TesseraServer::actingAs($user)->tool(AdoptCardCandidateTool::class, [
            'candidate_id' => $candidate->id,
            'deck_id' => $deck->id,
            'question' => '編集済みの質問?',
            'answer' => '編集済みの回答',
        ])->assertOk();

        $this->assertDatabaseHas('cards', [
            'question' => '編集済みの質問?',
            'answer' => '編集済みの回答',
        ]);
    }

    public function test_他ユーザーの候補は採用できない(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $othersCandidate = $this->makeCandidate(User::factory()->create());

        TesseraServer::actingAs($user)->tool(AdoptCardCandidateTool::class, [
            'candidate_id' => $othersCandidate->id,
            'deck_id' => $deck->id,
        ])->assertSee('not found');

        $this->assertDatabaseCount('cards', 0);
    }

    public function test_他ユーザーのデッキには採用できない(): void
    {
        $user = User::factory()->create();
        $othersDeck = Deck::factory()->for(User::factory())->create();
        $candidate = $this->makeCandidate($user);

        TesseraServer::actingAs($user)->tool(AdoptCardCandidateTool::class, [
            'candidate_id' => $candidate->id,
            'deck_id' => $othersDeck->id,
        ])->assertHasErrors();

        $this->assertDatabaseCount('cards', 0);
    }

    public function test_採用済み候補は再採用できない(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $candidate = AiCardCandidate::factory()
            ->for($user)
            ->for(NoteSeed::factory()->for($user))
            ->create(['status' => 'adopted']);

        TesseraServer::actingAs($user)->tool(AdoptCardCandidateTool::class, [
            'candidate_id' => $candidate->id,
            'deck_id' => $deck->id,
        ])->assertSee('adopted');

        $this->assertDatabaseCount('cards', 0);
    }
}
