<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class TagControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/tags')->assertUnauthorized();
    }

    public function test_自分のタグ一覧を取得できる(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        Tag::factory()->for($me)->create(['name' => 'js']);
        Tag::factory()->for($me)->create(['name' => 'php']);
        Tag::factory()->for($other)->create(['name' => 'ruby']);

        $this->actingAs($me)
            ->getJson('/api/v1/tags')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_タグを作成できる(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/tags', ['name' => 'design-pattern'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'design-pattern');

        $this->assertDatabaseHas('tags', [
            'user_id' => $user->id,
            'name' => 'design-pattern',
        ]);
    }

    public function test_同一ユーザーで同名タグは既存を返す(): void
    {
        $user = User::factory()->create();
        Tag::factory()->for($user)->create(['name' => 'existing']);

        $response = $this->actingAs($user)
            ->postJson('/api/v1/tags', ['name' => 'existing']);

        // findOrCreate の振る舞い: unique バリデーションで 422 になる (FormRequest側)
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_他ユーザーと同名は作成可能(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        Tag::factory()->for($other)->create(['name' => 'shared']);

        $this->actingAs($me)
            ->postJson('/api/v1/tags', ['name' => 'shared'])
            ->assertCreated();
    }

    public function test_タグを削除できる(): void
    {
        $user = User::factory()->create();
        $tag = Tag::factory()->for($user)->create();

        $this->actingAs($user)
            ->deleteJson("/api/v1/tags/{$tag->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tags', ['id' => $tag->id]);
    }
}
