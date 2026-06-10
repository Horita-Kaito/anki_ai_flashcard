<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Mcp\Servers\TesseraServer;
use App\Mcp\Tools\ListCardCandidatesTool;
use App\Mcp\Tools\ListDecksTool;
use App\Mcp\Tools\ListDueCardsTool;
use App\Models\AiCardCandidate;
use App\Models\Card;
use App\Models\CardSchedule;
use App\Models\Deck;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ListToolsTest extends TestCase
{
    use RefreshDatabase;

    private function makeDueCard(User $user, Deck $deck): Card
    {
        $card = Card::factory()->for($user)->for($deck)->create();
        CardSchedule::create([
            'user_id' => $user->id,
            'card_id' => $card->id,
            'repetitions' => 0,
            'interval_days' => 0,
            'ease_factor' => 2.50,
            'due_at' => now()->subMinute(),
            'lapse_count' => 0,
            'state' => 'new',
        ]);

        return $card;
    }

    public function test_メモの候補一覧をステータスで絞って取得できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();
        AiCardCandidate::factory()->for($user)->for($note)->create(['status' => 'pending']);
        AiCardCandidate::factory()->for($user)->for($note)->create(['status' => 'rejected']);

        TesseraServer::actingAs($user)->tool(ListCardCandidatesTool::class, [
            'note_seed_id' => $note->id,
            'status' => 'pending',
        ])->assertOk()->assertStructuredContent(
            fn ($json) => $json->where('total', 1)->etc()
        );
    }

    public function test_他ユーザーのメモの候補は参照できない(): void
    {
        $user = User::factory()->create();
        $othersNote = NoteSeed::factory()->for(User::factory())->create();

        TesseraServer::actingAs($user)->tool(ListCardCandidatesTool::class, [
            'note_seed_id' => $othersNote->id,
        ])->assertSee('not found');
    }

    public function test_自分のデッキだけが階層パス付きで一覧される(): void
    {
        $user = User::factory()->create();
        $parent = Deck::factory()->for($user)->create(['name' => '資格']);
        Deck::factory()->for($user)->create(['name' => 'AWS', 'parent_id' => $parent->id]);
        Deck::factory()->for(User::factory())->create(['name' => '他人のデッキ']);

        TesseraServer::actingAs($user)->tool(ListDecksTool::class, [])
            ->assertOk()
            ->assertStructuredContent(fn ($json) => $json->where('total', 2)->etc())
            ->assertSee('資格 / AWS')
            ->assertDontSee('他人のデッキ');
    }

    public function test_復習期限が来た自分のカードだけ取得できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $this->makeDueCard($user, $deck);
        $this->makeDueCard($user, $deck);

        $other = User::factory()->create();
        $this->makeDueCard($other, Deck::factory()->for($other)->create());

        TesseraServer::actingAs($user)->tool(ListDueCardsTool::class, [])
            ->assertOk()
            ->assertStructuredContent(fn ($json) => $json->where('total_returned', 2)->etc());
    }

    public function test_limitで取得枚数を制限できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $this->makeDueCard($user, $deck);
        $this->makeDueCard($user, $deck);
        $this->makeDueCard($user, $deck);

        TesseraServer::actingAs($user)->tool(ListDueCardsTool::class, ['limit' => 2])
            ->assertOk()
            ->assertStructuredContent(fn ($json) => $json->where('total_returned', 2)->etc());
    }
}
