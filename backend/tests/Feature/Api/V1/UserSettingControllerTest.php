<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use App\Contracts\Services\AI\AiProviderInterface;
use App\Models\DomainTemplate;
use App\Models\User;
use App\Models\UserSetting;
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
            ->assertJsonPath('data.default_ai_provider', 'openai');

        $this->assertDatabaseHas('user_settings', [
            'user_id' => $user->id,
            'default_ai_provider' => 'openai',
            'default_ai_model' => 'gpt-4o-mini',
        ]);
    }

    public function test_設定を更新できる(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/settings', [
                'default_ai_provider' => 'google',
                'default_ai_model' => 'gemini-2.5-flash',
            ])
            ->assertOk()
            ->assertJsonPath('data.default_ai_provider', 'google')
            ->assertJsonPath('data.default_ai_model', 'gemini-2.5-flash');
    }

    public function test_providerだけを更新すると対応する既定modelへ補正される(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/settings', [
                'default_ai_provider' => 'google',
            ])
            ->assertOk()
            ->assertJsonPath('data.default_ai_provider', 'google')
            ->assertJsonPath('data.default_ai_model', 'gemini-2.5-flash');

        $this->assertDatabaseHas('user_settings', [
            'user_id' => $user->id,
            'default_ai_provider' => 'google',
            'default_ai_model' => 'gemini-2.5-flash',
        ]);
    }

    public function test_provider非対応modelは対応する既定modelへ補正される(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/settings', [
                'default_ai_provider' => 'google',
                'default_ai_model' => 'gpt-4.1-mini',
            ])
            ->assertOk()
            ->assertJsonPath('data.default_ai_provider', 'google')
            ->assertJsonPath('data.default_ai_model', 'gemini-2.5-flash');
    }

    public function test_未知のmodelは422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/settings', [
                'default_ai_model' => 'unknown-model',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['default_ai_model']);
    }

    public function test_初期設定のproviderとmodelが不整合なら既定modelへ補正される(): void
    {
        config()->set('ai.default_provider', 'google');
        config()->set('ai.default_model', 'gpt-4o-mini');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.default_ai_provider', 'google')
            ->assertJsonPath('data.default_ai_model', 'gemini-2.5-flash');
    }

    public function test_未実装のanthropicは422(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->putJson('/api/v1/settings', ['default_ai_provider' => 'anthropic'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['default_ai_provider']);
    }

    public function test_保存済みの未実装anthropic設定はopenaiとして返す(): void
    {
        $user = User::factory()->create();
        UserSetting::create([
            'user_id' => $user->id,
            'default_ai_provider' => 'anthropic',
            'default_ai_model' => 'claude-3-5-haiku-latest',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.default_ai_provider', 'openai')
            ->assertJsonPath('data.default_ai_model', 'gpt-4o-mini');
    }

    public function test_保存済みのprovider非対応modelは既定modelとして返す(): void
    {
        $user = User::factory()->create();
        UserSetting::create([
            'user_id' => $user->id,
            'default_ai_provider' => 'google',
            'default_ai_model' => 'gpt-4.1-mini',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.default_ai_provider', 'google')
            ->assertJsonPath('data.default_ai_model', 'gemini-2.5-flash');
    }

    public function test_既定providerが未実装anthropicでもopenaiへフォールバックする(): void
    {
        config()->set('ai.default_provider', 'anthropic');

        $this->assertSame('openai', app(AiProviderInterface::class)->name());
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
