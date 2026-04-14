<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Card;
use App\Models\Deck;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/cards')->assertUnauthorized();
    }

    public function test_自分のカードのみ一覧に含まれる(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $myDeck = Deck::factory()->for($me)->create();
        $otherDeck = Deck::factory()->for($other)->create();
        Card::factory()->count(2)->for($me)->for($myDeck)->create();
        Card::factory()->count(3)->for($other)->for($otherDeck)->create();

        $this->actingAs($me)
            ->getJson('/api/v1/cards')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_deck_idで絞り込める(): void
    {
        $user = User::factory()->create();
        $deckA = Deck::factory()->for($user)->create();
        $deckB = Deck::factory()->for($user)->create();
        Card::factory()->count(2)->for($user)->for($deckA)->create();
        Card::factory()->count(3)->for($user)->for($deckB)->create();

        $this->actingAs($user)
            ->getJson("/api/v1/cards?deck_id={$deckA->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_カード作成時にスケジュールが自動生成される(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'DIとは?',
            'answer' => '依存性注入',
            'card_type' => 'basic_qa',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.question', 'DIとは?')
            ->assertJsonPath('data.schedule.state', 'new')
            ->assertJsonPath('data.schedule.repetitions', 0);

        $card = Card::first();
        $this->assertNotNull($card);
        $this->assertDatabaseHas('card_schedules', [
            'card_id' => $card->id,
            'state' => 'new',
        ]);
    }

    public function test_タグ付きでカードを作成できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $tag = Tag::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
            'tag_ids' => [$tag->id],
        ]);

        $response->assertCreated()
            ->assertJsonCount(1, 'data.tags');

        $this->assertDatabaseHas('card_tag', [
            'card_id' => Card::first()->id,
            'tag_id' => $tag->id,
        ]);
    }

    public function test_他ユーザーのデッキでは作成できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $otherDeck = Deck::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson('/api/v1/cards', [
                'deck_id' => $otherDeck->id,
                'question' => 'Q',
                'answer' => 'A',
                'card_type' => 'basic_qa',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['deck_id']);
    }

    public function test_他ユーザーのタグでは作成できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $deck = Deck::factory()->for($me)->create();
        $otherTag = Tag::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson('/api/v1/cards', [
                'deck_id' => $deck->id,
                'question' => 'Q',
                'answer' => 'A',
                'card_type' => 'basic_qa',
                'tag_ids' => [$otherTag->id],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tag_ids.0']);
    }

    public function test_不正なcard_typeで422(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson('/api/v1/cards', [
                'deck_id' => $deck->id,
                'question' => 'Q',
                'answer' => 'A',
                'card_type' => 'invalid',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['card_type']);
    }

    public function test_他ユーザーのカードは詳細取得できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $otherDeck = Deck::factory()->for($other)->create();
        $card = Card::factory()->for($other)->for($otherDeck)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/cards/{$card->id}")
            ->assertNotFound();
    }

    public function test_自分のカードを更新できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $card = Card::factory()->for($user)->for($deck)->create(['question' => 'before']);

        $this->actingAs($user)
            ->putJson("/api/v1/cards/{$card->id}", ['question' => 'after'])
            ->assertOk()
            ->assertJsonPath('data.question', 'after');
    }

    public function test_カード削除でスケジュールも消える(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $response = $this->actingAs($user)->postJson('/api/v1/cards', [
            'deck_id' => $deck->id,
            'question' => 'Q',
            'answer' => 'A',
            'card_type' => 'basic_qa',
        ]);

        $cardId = $response->json('data.id');

        $this->actingAs($user)
            ->deleteJson("/api/v1/cards/{$cardId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('cards', ['id' => $cardId]);
        $this->assertDatabaseMissing('card_schedules', ['card_id' => $cardId]);
    }
}
