<?php

declare(strict_types=1);

namespace Tests\Unit\Services\AI;

use App\Contracts\Repositories\UserSettingRepositoryInterface;
use App\Models\User;
use App\Models\UserSetting;
use App\Services\AI\AiRuntimeResolver;
use App\Services\AI\OpenAiProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AiRuntimeResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_ユーザー設定のproviderとmodelを解決する(): void
    {
        $user = User::factory()->create();
        UserSetting::create([
            'user_id' => $user->id,
            'default_ai_provider' => 'google',
            'default_ai_model' => 'gemini-2.5-flash',
        ]);

        $resolver = new AiRuntimeResolver(
            settingRepository: app(UserSettingRepositoryInterface::class),
            defaultProvider: OpenAiProvider::fromConfig(),
            container: app(),
        );

        $runtime = $resolver->resolveForUser($user->id);

        $this->assertSame('google', $runtime->provider->name());
        $this->assertSame('gemini-2.5-flash', $runtime->model);
    }

    public function test_未実装providerの保存済み設定はconfig既定値へフォールバックする(): void
    {
        config()->set('ai.default_provider', 'openai');
        config()->set('ai.default_model', 'gpt-4o-mini');

        $user = User::factory()->create();
        UserSetting::create([
            'user_id' => $user->id,
            'default_ai_provider' => 'anthropic',
            'default_ai_model' => 'claude-3-5-haiku-latest',
        ]);

        $resolver = new AiRuntimeResolver(
            settingRepository: app(UserSettingRepositoryInterface::class),
            defaultProvider: OpenAiProvider::fromConfig(),
            container: app(),
        );

        $runtime = $resolver->resolveForUser($user->id);

        $this->assertSame('openai', $runtime->provider->name());
        $this->assertSame('gpt-4o-mini', $runtime->model);
    }

    public function test_provider非対応modelはprovider既定値へフォールバックする(): void
    {
        $user = User::factory()->create();
        UserSetting::create([
            'user_id' => $user->id,
            'default_ai_provider' => 'google',
            'default_ai_model' => 'gpt-4.1-mini',
        ]);

        $resolver = new AiRuntimeResolver(
            settingRepository: app(UserSettingRepositoryInterface::class),
            defaultProvider: OpenAiProvider::fromConfig(),
            container: app(),
        );

        $runtime = $resolver->resolveForUser($user->id);

        $this->assertSame('google', $runtime->provider->name());
        $this->assertSame('gemini-2.5-flash', $runtime->model);
    }
}
