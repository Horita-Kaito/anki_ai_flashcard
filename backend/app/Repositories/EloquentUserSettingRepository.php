<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\UserSettingRepositoryInterface;
use App\Models\UserSetting;

final class EloquentUserSettingRepository implements UserSettingRepositoryInterface
{
    public function findForUser(int $userId): ?UserSetting
    {
        return UserSetting::query()->where('user_id', $userId)->first();
    }

    public function createDefault(int $userId): UserSetting
    {
        $provider = $this->defaultProvider();

        return UserSetting::create([
            'user_id' => $userId,
            'default_ai_provider' => $provider,
            'default_ai_model' => $provider === config('ai.default_provider', 'openai')
                ? config('ai.default_model', 'gpt-4o-mini')
                : $this->defaultModel($provider),
        ]);
    }

    public function create(int $userId, array $attributes): UserSetting
    {
        return UserSetting::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(UserSetting $setting, array $attributes): UserSetting
    {
        $setting->update($attributes);

        return $setting->refresh();
    }

    private function defaultProvider(): string
    {
        $provider = config('ai.default_provider', 'openai');

        return in_array($provider, ['openai', 'google'], true) ? $provider : 'openai';
    }

    private function defaultModel(string $provider): string
    {
        return match ($provider) {
            'google' => 'gemini-2.5-flash',
            default => 'gpt-4o-mini',
        };
    }
}
