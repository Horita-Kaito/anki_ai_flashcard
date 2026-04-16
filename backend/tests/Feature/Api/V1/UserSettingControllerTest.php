<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Models\DomainTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class UserSettingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_未認証では401(): void
    {
        $this->getJson('/api/v1/settings')->assertUnauthorized();
    }

    public function test_初回アクセスでデフォルト設定が返る(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.daily_new_limit', 20)
            ->assertJsonPath('data.daily_review_limit', 100)
            ->assertJsonPath('data.default_ai_provider', config('ai.default_provider'));

        $this->assertDatabaseHas('user_settings', ['user_id' => $user->id]);
    }

    public function test_設定を更新できる(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/settings', [
                'daily_new_limit' => 50,
                'daily_review_limit' => 200,
                'default_ai_provider' => 'anthropic',
                'default_generation_count' => 5,
            ])
            ->assertOk()
            ->assertJsonPath('data.daily_new_limit', 50)
            ->assertJsonPath('data.default_ai_provider', 'anthropic');
    }

    public function test_無効な_a_iプロバイダで422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/settings', ['default_ai_provider' => 'invalid'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['default_ai_provider']);
    }

    public function test_他ユーザーのテンプレート_i_dで422(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $template = DomainTemplate::factory()->for($other)->create();

        $this->actingAs($me)
            ->putJson('/api/v1/settings', [
                'default_domain_template_id' => $template->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['default_domain_template_id']);
    }
}
