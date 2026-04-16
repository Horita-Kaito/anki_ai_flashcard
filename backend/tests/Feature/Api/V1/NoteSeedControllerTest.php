<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\DomainTemplate;
use App\Models\NoteSeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class NoteSeedControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/note-seeds')->assertUnauthorized();
    }

    public function test_一覧は自分のメモのみ返す(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        NoteSeed::factory()->count(2)->for($me)->create();
        NoteSeed::factory()->count(3)->for($other)->create();

        $this->actingAs($me)
            ->getJson('/api/v1/note-seeds')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_メモを作成できる(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/v1/note-seeds', [
            'body' => 'DIは依存を外から渡すことで差し替えやすくなる',
            'learning_goal' => 'DIの基本を理解する',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.body', 'DIは依存を外から渡すことで差し替えやすくなる');

        $this->assertDatabaseHas('note_seeds', ['user_id' => $user->id]);
    }

    public function test_body空白のみで422(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/api/v1/note-seeds', ['body' => '   '])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_body未指定で422(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/api/v1/note-seeds', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['body']);
    }

    public function test_他ユーザーのテンプレート_i_dで422(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $template = DomainTemplate::factory()->for($other)->create();

        $this->actingAs($me)
            ->postJson('/api/v1/note-seeds', [
                'body' => 'ok',
                'domain_template_id' => $template->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['domain_template_id']);
    }

    public function test_他ユーザーのメモ詳細は404(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $note = NoteSeed::factory()->for($other)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/note-seeds/{$note->id}")
            ->assertNotFound();
    }

    public function test_自分のメモを更新できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create(['body' => 'before']);

        $response = $this->actingAs($user)
            ->putJson("/api/v1/note-seeds/{$note->id}", ['body' => 'after']);

        $response->assertOk()->assertJsonPath('data.body', 'after');
    }

    public function test_他ユーザーのメモは更新できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $note = NoteSeed::factory()->for($other)->create();

        $this->actingAs($me)
            ->putJson("/api/v1/note-seeds/{$note->id}", ['body' => 'hack'])
            ->assertNotFound();
    }

    public function test_自分のメモを削除できる(): void
    {
        $user = User::factory()->create();
        $note = NoteSeed::factory()->for($user)->create();

        $this->actingAs($user)
            ->deleteJson("/api/v1/note-seeds/{$note->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('note_seeds', ['id' => $note->id]);
    }
}
