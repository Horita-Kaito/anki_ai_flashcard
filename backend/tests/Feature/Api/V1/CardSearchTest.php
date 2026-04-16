<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Card;
use App\Models\Deck;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CardSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_qでquestionをキーワード検索できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        Card::factory()->for($user)->for($deck)->create([
            'question' => 'DIとは何か',
            'answer' => '依存性注入',
        ]);
        Card::factory()->for($user)->for($deck)->create([
            'question' => 'Reactとは何か',
            'answer' => 'UIライブラリ',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/cards?q=DI')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_qでanswerも検索対象(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        Card::factory()->for($user)->for($deck)->create([
            'question' => 'Q1',
            'answer' => '依存性注入',
        ]);
        Card::factory()->for($user)->for($deck)->create([
            'question' => 'Q2',
            'answer' => 'UIライブラリ',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/cards?q=UI')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_tag_idでタグ絞り込みできる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        $tagA = Tag::factory()->for($user)->create();
        $tagB = Tag::factory()->for($user)->create();

        $c1 = Card::factory()->for($user)->for($deck)->create();
        $c1->tags()->attach($tagA);
        $c2 = Card::factory()->for($user)->for($deck)->create();
        $c2->tags()->attach($tagB);

        $this->actingAs($user)
            ->getJson("/api/v1/cards?tag_id={$tagA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $c1->id);
    }

    public function test_lik_eのワイルドカードがエスケープされる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();
        Card::factory()->for($user)->for($deck)->create([
            'question' => 'Q1',
            'answer' => 'hello',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/cards?q=%')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_deck_idとqを同時指定できる(): void
    {
        $user = User::factory()->create();
        $deckA = Deck::factory()->for($user)->create();
        $deckB = Deck::factory()->for($user)->create();
        Card::factory()->for($user)->for($deckA)->create(['question' => 'DIとは']);
        Card::factory()->for($user)->for($deckB)->create(['question' => 'DIとは']);

        $this->actingAs($user)
            ->getJson("/api/v1/cards?q=DI&deck_id={$deckA->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }
}
