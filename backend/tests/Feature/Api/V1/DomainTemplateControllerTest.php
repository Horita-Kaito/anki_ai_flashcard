<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\DomainTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class DomainTemplateControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validPayload(array $overrides = []): array
    {
        return array_replace([
            'name' => 'Web開発',
            'description' => 'Web開発用の策問テンプレート',
            'domain_hint' => 'Web開発の基礎を定着させる。定義と「なぜ必要か」を軸に簡潔に。',
        ], $overrides);
    }

    public function test_未認証では401を返す(): void
    {
        $this->getJson('/api/v1/domain-templates')->assertUnauthorized();
    }

    public function test_認証ユーザーは自分のテンプレート一覧を取得できる(): void
    {
        $user = User::factory()->create();
        DomainTemplate::factory()->count(2)->for($user)->create();

        $response = $this->actingAs($user)->getJson('/api/v1/domain-templates');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_他ユーザーのテンプレートは一覧に含まれない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        DomainTemplate::factory()->count(1)->for($me)->create();
        DomainTemplate::factory()->count(3)->for($other)->create();

        $this->actingAs($me)
            ->getJson('/api/v1/domain-templates')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_テンプレートを作成できる(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $this->validPayload());

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Web開発')
            ->assertJsonPath('data.domain_hint', 'Web開発の基礎を定着させる。定義と「なぜ必要か」を軸に簡潔に。');

        $this->assertDatabaseHas('domain_templates', [
            'user_id' => $user->id,
            'name' => 'Web開発',
        ]);
    }

    public function test_domain_hint未指定でも作成できる(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload();
        unset($payload['domain_hint']);

        $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $payload)
            ->assertCreated()
            ->assertJsonPath('data.domain_hint', null);
    }

    public function test_name未指定で422を返す(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $this->validPayload(['name' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_domain_hintが500字超で422を返す(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload(['domain_hint' => str_repeat('あ', 501)]);

        $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['domain_hint']);
    }

    public function test_他ユーザーのテンプレート詳細は404(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $template = DomainTemplate::factory()->for($other)->create();

        $this->actingAs($me)
            ->getJson("/api/v1/domain-templates/{$template->id}")
            ->assertNotFound();
    }

    public function test_自分のテンプレートを更新できる(): void
    {
        $user = User::factory()->create();
        $template = DomainTemplate::factory()->for($user)->create(['name' => 'before']);

        $response = $this->actingAs($user)
            ->putJson("/api/v1/domain-templates/{$template->id}", ['name' => 'after']);

        $response->assertOk()->assertJsonPath('data.name', 'after');
    }

    public function test_他ユーザーのテンプレートは更新できない(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $template = DomainTemplate::factory()->for($other)->create();

        $this->actingAs($me)
            ->putJson("/api/v1/domain-templates/{$template->id}", ['name' => 'hack'])
            ->assertNotFound();
    }

    public function test_自分のテンプレートを削除できる(): void
    {
        $user = User::factory()->create();
        $template = DomainTemplate::factory()->for($user)->create();

        $this->actingAs($user)
            ->deleteJson("/api/v1/domain-templates/{$template->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('domain_templates', ['id' => $template->id]);
    }
}
