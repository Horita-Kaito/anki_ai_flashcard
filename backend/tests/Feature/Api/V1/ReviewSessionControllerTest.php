<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Card;
use App\Models\CardSchedule;
use App\Models\Deck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ReviewSessionControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/review-sessions/today')->assertUnauthorized();
    }

    private function makeCardWithSchedule(
        User $user,
        Deck $deck,
        array $overrides = [],
    ): Card {
        $card = Card::factory()->for($user)->for($deck)->create($overrides);
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

    public function test_今日の復習対象カードを取得できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $this->makeCardWithSchedule($user, $deck);
        $this->makeCardWithSchedule($user, $deck);

        $this->actingAs($user)
            ->getJson('/api/v1/review-sessions/today')
            ->assertOk()
            ->assertJsonPath('data.total_due', 2)
            ->assertJsonPath('data.new_count', 2)
            ->assertJsonCount(2, 'data.cards');
    }

    public function test_他ユーザーのカードは含まれない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $myDeck = Deck::factory()->for($me)->create();
        $otherDeck = Deck::factory()->for($other)->create();
        $this->makeCardWithSchedule($me, $myDeck);
        $this->makeCardWithSchedule($other, $otherDeck);

        $this->actingAs($me)
            ->getJson('/api/v1/review-sessions/today')
            ->assertOk()
            ->assertJsonPath('data.total_due', 1);
    }

    public function test_未来_due_at_のカードは含まれない(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create();
        CardSchedule::create([
            'user_id' => $user->id,
            'card_id' => $card->id,
            'repetitions' => 5,
            'interval_days' => 7,
            'ease_factor' => 2.50,
            'due_at' => now()->addDays(3),
            'lapse_count' => 0,
            'state' => 'review',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/review-sessions/today')
            ->assertOk()
            ->assertJsonPath('data.total_due', 0);
    }

    public function test_deck_idフィルタ(): void
    {
        $user = User::factory()->create();
        $deckA = Deck::factory()->for($user)->create();
        $deckB = Deck::factory()->for($user)->create();
        $this->makeCardWithSchedule($user, $deckA);
        $this->makeCardWithSchedule($user, $deckB);

        $this->actingAs($user)
            ->getJson("/api/v1/review-sessions/today?deck_id={$deckA->id}")
            ->assertOk()
            ->assertJsonPath('data.total_due', 1);
    }

    public function test_親デッキ指定で子孫デッキのカードも復習対象に含まれる(): void
    {
        $user = User::factory()->create();
        $parent = Deck::factory()->for($user)->create();
        $child = Deck::factory()->for($user)->create(['parent_id' => $parent->id]);
        $grand = Deck::factory()->for($user)->create(['parent_id' => $child->id]);
        $other = Deck::factory()->for($user)->create();

        // parent(直下), child(孫), grand(ひ孫), other(無関係) にそれぞれカード
        $this->makeCardWithSchedule($user, $parent);
        $this->makeCardWithSchedule($user, $child);
        $this->makeCardWithSchedule($user, $grand);
        $this->makeCardWithSchedule($user, $other);

        $this->actingAs($user)
            ->getJson("/api/v1/review-sessions/today?deck_id={$parent->id}")
            ->assertOk()
            ->assertJsonPath('data.total_due', 3);
    }

    public function test_suspended_カードは含まれない(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $this->makeCardWithSchedule($user, $deck, ['is_suspended' => true]);

        $this->actingAs($user)
            ->getJson('/api/v1/review-sessions/today')
            ->assertOk()
            ->assertJsonPath('data.total_due', 0);
    }

    public function test_good回答でスケジュールがreview状態になる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = $this->makeCardWithSchedule($user, $deck);

        $response = $this->actingAs($user)->postJson('/api/v1/review-sessions/answer', [
            'card_id' => $card->id,
            'rating' => 'good',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.rating', 'good')
            ->assertJsonPath('data.updated_schedule.state', 'review')
            ->assertJsonPath('data.updated_schedule.interval_days', 1)
            ->assertJsonPath('data.updated_schedule.repetitions', 1);

        $this->assertDatabaseHas('card_reviews', [
            'user_id' => $user->id,
            'card_id' => $card->id,
            'rating' => 'good',
        ]);
    }

    public function test_again回答でlapseが増える_review_state(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create();
        CardSchedule::create([
            'user_id' => $user->id,
            'card_id' => $card->id,
            'repetitions' => 3,
            'interval_days' => 10,
            'ease_factor' => 2.50,
            'due_at' => now()->subHour(),
            'lapse_count' => 0,
            'state' => 'review',
        ]);

        $this->actingAs($user)->postJson('/api/v1/review-sessions/answer', [
            'card_id' => $card->id,
            'rating' => 'again',
        ])
            ->assertOk()
            ->assertJsonPath('data.updated_schedule.state', 'relearning')
            ->assertJsonPath('data.updated_schedule.lapse_count', 1);
    }

    public function test_他ユーザーのカードへは回答できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $otherDeck = Deck::factory()->for($other)->create();
        $card = $this->makeCardWithSchedule($other, $otherDeck);

        $this->actingAs($me)
            ->postJson('/api/v1/review-sessions/answer', [
                'card_id' => $card->id,
                'rating' => 'good',
            ])
            ->assertNotFound();
    }

    public function test_不正なrating値で422(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = $this->makeCardWithSchedule($user, $deck);

        $this->actingAs($user)
            ->postJson('/api/v1/review-sessions/answer', [
                'card_id' => $card->id,
                'rating' => 'invalid',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    public function test_統計を取得できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = $this->makeCardWithSchedule($user, $deck);

        $this->actingAs($user)->postJson('/api/v1/review-sessions/answer', [
            'card_id' => $card->id,
            'rating' => 'good',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/review-stats')
            ->assertOk()
            ->assertJsonPath('data.today.completed_count', 1)
            ->assertJsonPath('data.today.good_count', 1)
            ->assertJsonPath('data.overall.total_reviews', 1);
    }
}
