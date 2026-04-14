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

    /** @return array<string, mixed> */
    private function validPayload(array $overrides = []): array
    {
        return array_replace_recursive([
            'name' => 'Web開発',
            'description' => 'Web開発用の策問テンプレート',
            'instruction_json' => [
                'goal' => 'Web開発の基礎を定着させる',
                'priorities' => ['定義を問う', 'なぜ必要かを問う'],
                'avoid' => ['長文回答を求める'],
                'preferred_card_types' => ['basic_qa', 'comparison'],
                'answer_style' => '1-2文で簡潔に',
                'difficulty_policy' => '初学者向け',
                'note_interpretation_policy' => 'メモにない内容を補完しない',
            ],
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
            ->assertJsonPath('data.instruction_json.goal', 'Web開発の基礎を定着させる');

        $this->assertDatabaseHas('domain_templates', [
            'user_id' => $user->id,
            'name' => 'Web開発',
        ]);
    }

    public function test_name未指定で422を返す(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $this->validPayload(['name' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_goal未指定で422を返す(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload();
        $payload['instruction_json']['goal'] = '';

        $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['instruction_json.goal']);
    }

    public function test_優先観点が空配列で422を返す(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload();
        $payload['instruction_json']['priorities'] = [];

        $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['instruction_json.priorities']);
    }

    public function test_無効なcard_typeで422を返す(): void
    {
        $user = User::factory()->create();
        $payload = $this->validPayload();
        $payload['instruction_json']['preferred_card_types'] = ['invalid_type'];

        $this->actingAs($user)
            ->postJson('/api/v1/domain-templates', $payload)
            ->assertStatus(422);
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
