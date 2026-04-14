<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Deck;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DeckControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401を返す(): void
    {
        $this->getJson('/api/v1/decks')->assertUnauthorized();
        $this->postJson('/api/v1/decks', [])->assertUnauthorized();
    }

    public function test_認証ユーザーはデッキ一覧を取得できる(): void
    {
        $user = User::factory()->create();
        Deck::factory()->count(3)->for($user)->create();

        $response = $this->actingAs($user)->getJson('/api/v1/decks');

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    ['id', 'name', 'description', 'new_cards_limit', 'created_at', 'updated_at'],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);
    }

    public function test_他ユーザーのデッキは一覧に含まれない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        Deck::factory()->count(2)->for($me)->create();
        Deck::factory()->count(3)->for($other)->create();

        $response = $this->actingAs($me)->getJson('/api/v1/decks');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_デッキを作成できる(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/decks', [
            'name' => 'Web開発',
            'description' => 'Web開発の基礎知識',
            'new_cards_limit' => 30,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Web開発')
            ->assertJsonPath('data.new_cards_limit', 30);

        $this->assertDatabaseHas('decks', [
            'user_id' => $user->id,
            'name' => 'Web開発',
        ]);
    }

    public function test_name未指定でバリデーションエラー(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/decks', ['description' => '説明'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_他ユーザーのデッキ詳細は404を返す(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $deck = Deck::factory()->for($other)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/decks/{$deck->id}")
            ->assertNotFound();
    }

    public function test_自分のデッキを更新できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create(['name' => 'before']);

        $response = $this->actingAs($user)->putJson("/api/v1/decks/{$deck->id}", [
            'name' => 'after',
        ]);

        $response->assertOk()->assertJsonPath('data.name', 'after');
        $this->assertDatabaseHas('decks', ['id' => $deck->id, 'name' => 'after']);
    }

    public function test_他ユーザーのデッキは更新できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $deck = Deck::factory()->for($other)->create();

        $this->actingAs($me)
            ->putJson("/api/v1/decks/{$deck->id}", ['name' => 'hacked'])
            ->assertNotFound();

        $this->assertDatabaseMissing('decks', ['id' => $deck->id, 'name' => 'hacked']);
    }

    public function test_自分のデッキを削除できる(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $this->actingAs($user)
            ->deleteJson("/api/v1/decks/{$deck->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('decks', ['id' => $deck->id]);
    }

    public function test_他ユーザーのデッキは削除できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $deck = Deck::factory()->for($other)->create();

        $this->actingAs($me)
            ->deleteJson("/api/v1/decks/{$deck->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('decks', ['id' => $deck->id]);
    }
}
