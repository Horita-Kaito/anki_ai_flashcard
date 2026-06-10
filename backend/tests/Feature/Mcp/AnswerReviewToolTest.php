<?php

declare(strict_types=1);

namespace Tests\Feature\Mcp;

use App\Mcp\Servers\TesseraServer;
use App\Mcp\Tools\AnswerReviewTool;
use App\Models\Card;
use App\Models\CardSchedule;
use App\Models\Deck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AnswerReviewToolTest extends TestCase
{
    use RefreshDatabase;

    private function makeDueCard(User $user): Card
    {
        $card = Card::factory()
            ->for($user)
            ->for(Deck::factory()->for($user))
            ->create();
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

    public function test_回答を記録するとスケジュールが更新されレビュー履歴が残る(): void
    {
        $user = User::factory()->create();
        $card = $this->makeDueCard($user);

        TesseraServer::actingAs($user)->tool(AnswerReviewTool::class, [
            'card_id' => $card->id,
            'rating' => 'good',
            'response_time_ms' => 4200,
        ])->assertOk();

        $this->assertDatabaseHas('card_reviews', [
            'card_id' => $card->id,
            'user_id' => $user->id,
            'rating' => 'good',
        ]);
        $this->assertTrue(
            $card->schedule()->first()->due_at->isAfter(now()),
            '回答後は次回期日が未来になる',
        );
    }

    public function test_不正なratingはバリデーションエラー(): void
    {
        $user = User::factory()->create();
        $card = $this->makeDueCard($user);

        TesseraServer::actingAs($user)->tool(AnswerReviewTool::class, [
            'card_id' => $card->id,
            'rating' => 'perfect',
        ])->assertHasErrors();

        $this->assertDatabaseCount('card_reviews', 0);
    }

    public function test_他ユーザーのカードには回答を記録できない(): void
    {
        $user = User::factory()->create();
        $othersCard = $this->makeDueCard(User::factory()->create());

        TesseraServer::actingAs($user)->tool(AnswerReviewTool::class, [
            'card_id' => $othersCard->id,
            'rating' => 'good',
        ])->assertSee('not found');

        $this->assertDatabaseCount('card_reviews', 0);
    }
}
