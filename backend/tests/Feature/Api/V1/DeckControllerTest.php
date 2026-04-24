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
                    ['id', 'parent_id', 'name', 'description', 'display_order', 'created_at', 'updated_at'],
                ],
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
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Web開発')
            ->assertJsonPath('data.parent_id', null);

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

    public function test_子デッキがあると親デッキは削除できず409を返す(): void
    {
        $user = User::factory()->create();
        $parent = Deck::factory()->for($user)->create();
        $child = Deck::factory()->for($user)->create(['parent_id' => $parent->id]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/decks/{$parent->id}")
            ->assertStatus(409);

        $this->assertDatabaseHas('decks', ['id' => $parent->id]);
        $this->assertDatabaseHas('decks', ['id' => $child->id]);
    }

    public function test_親を指定してデッキを作成できる(): void
    {
        $user = User::factory()->create();
        $parent = Deck::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson('/api/v1/decks', [
                'name' => '子デッキ',
                'parent_id' => $parent->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.parent_id', $parent->id);
    }

    public function test_親に自身を指定すると422(): void
    {
        $user = User::factory()->create();
        $deck = Deck::factory()->for($user)->create();

        $this->actingAs($user)
            ->putJson("/api/v1/decks/{$deck->id}", ['parent_id' => $deck->id])
            ->assertStatus(422);
    }

    public function test_親に自身の子孫を指定すると422(): void
    {
        $user = User::factory()->create();
        $parent = Deck::factory()->for($user)->create();
        $child = Deck::factory()->for($user)->create(['parent_id' => $parent->id]);
        $grandchild = Deck::factory()->for($user)->create(['parent_id' => $child->id]);

        $this->actingAs($user)
            ->putJson("/api/v1/decks/{$parent->id}", ['parent_id' => $grandchild->id])
            ->assertStatus(422);
    }

    public function test_tree一括更新で階層と並び順を同時に変更できる(): void
    {
        $user = User::factory()->create();
        $a = Deck::factory()->for($user)->create(['display_order' => 0]);
        $b = Deck::factory()->for($user)->create(['display_order' => 1]);
        $c = Deck::factory()->for($user)->create(['display_order' => 2]);

        $this->actingAs($user)
            ->postJson('/api/v1/decks/tree', [
                'nodes' => [
                    ['id' => $a->id, 'parent_id' => null, 'display_order' => 0],
                    ['id' => $b->id, 'parent_id' => $a->id, 'display_order' => 0],
                    ['id' => $c->id, 'parent_id' => $a->id, 'display_order' => 1],
                ],
            ])
            ->assertNoContent();

        $this->assertDatabaseHas('decks', ['id' => $b->id, 'parent_id' => $a->id, 'display_order' => 0]);
        $this->assertDatabaseHas('decks', ['id' => $c->id, 'parent_id' => $a->id, 'display_order' => 1]);
    }

    public function test_tree一括更新で循環は422(): void
    {
        $user = User::factory()->create();
        $a = Deck::factory()->for($user)->create();
        $b = Deck::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson('/api/v1/decks/tree', [
                'nodes' => [
                    ['id' => $a->id, 'parent_id' => $b->id, 'display_order' => 0],
                    ['id' => $b->id, 'parent_id' => $a->id, 'display_order' => 0],
                ],
            ])
            ->assertStatus(422);
    }
}
