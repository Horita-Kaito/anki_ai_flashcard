<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Mcp\Servers\TesseraServer;
use App\Mcp\Tools\ProposeCardCandidatesTool;
use App\Models\NoteSeed;
use App\Models\User;
use App\Services\ExternalCardProposalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ProposeCardCandidatesToolTest extends TestCase
{
    use RefreshDatabase;

    public function test_既存メモに候補を提案できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        TesseraServer::actingAs($user)->tool(ProposeCardCandidatesTool::class, [
            'note_seed_id' => $note->id,
            'model_name' => 'claude-fable-5',
            'candidates' => [
                ['question' => 'DIとは何の略か', 'answer' => 'Dependency Injection'],
                ['question' => 'DIの主目的は', 'answer' => '依存の差し替え可能化', 'card_type' => 'basic_qa'],
            ],
        ])->assertOk();

        $this->assertDatabaseCount('ai_card_candidates', 2);
        $this->assertDatabaseHas('ai_card_candidates', [
            'user_id' => $user->id,
            'note_seed_id' => $note->id,
            'provider' => ExternalCardProposalService::PROVIDER,
            'model_name' => 'claude-fable-5',
            'status' => 'pending',
            'ai_generation_log_id' => null,
        ]);
    }

    public function test_note_contentを渡すと新規メモが作られて候補が紐づく(): void
    {
        $user = User::factory()->create();

        TesseraServer::actingAs($user)->tool(ProposeCardCandidatesTool::class, [
            'note_content' => 'HTTPステータスコードの分類について',
            'candidates' => [
                ['question' => '4xx系の意味は', 'answer' => 'クライアントエラー'],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('note_seeds', [
            'user_id' => $user->id,
            'body' => 'HTTPステータスコードの分類について',
        ]);
        $this->assertDatabaseCount('ai_card_candidates', 1);
    }

    public function test_提案しても_cardは一切作成されない(): void
    {
        $user = User::factory()->create();

        TesseraServer::actingAs($user)->tool(ProposeCardCandidatesTool::class, [
            'note_content' => '採用前にカード化されないことの確認',
            'candidates' => [
                ['question' => '候補は自動採用されるか', 'answer' => 'されない'],
            ],
        ])->assertOk();

        // 不変条件: 人間のレビューを経ない限り cards には書かれない
        $this->assertDatabaseCount('cards', 0);
        $this->assertDatabaseCount('card_schedules', 0);
    }

    public function test_他ユーザーのメモには提案できない(): void
    {
        $user = User::factory()->create();
        $othersNote = NoteSeed::factory()->for(User::factory())->create();

        TesseraServer::actingAs($user)->tool(ProposeCardCandidatesTool::class, [
            'note_seed_id' => $othersNote->id,
            'candidates' => [
                ['question' => '分離確認', 'answer' => 'NG'],
            ],
        ])->assertHasErrors();

        $this->assertDatabaseCount('ai_card_candidates', 0);
    }

    public function test_重複質問はskipped_duplicatesとして報告される(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        TesseraServer::actingAs($user)->tool(ProposeCardCandidatesTool::class, [
            'note_seed_id' => $note->id,
            'candidates' => [
                ['question' => 'DIとは何の略か', 'answer' => 'Dependency Injection'],
                ['question' => 'DIとは何の略か', 'answer' => '重複した質問'],
            ],
        ])->assertOk()->assertStructuredContent(
            fn ($json) => $json->where('skipped_duplicates', 1)->etc()
        );

        $this->assertDatabaseCount('ai_card_candidates', 1);
    }

    public function test_note_seed_idとnote_contentの同時指定はエラー(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        TesseraServer::actingAs($user)->tool(ProposeCardCandidatesTool::class, [
            'note_seed_id' => $note->id,
            'note_content' => '両方指定',
            'candidates' => [
                ['question' => 'q', 'answer' => 'a'],
            ],
        ])->assertHasErrors();
    }
}
