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
        $model = (string) config('ai.default_model', 'gpt-4o-mini');

        return UserSetting::create([
            'user_id' => $userId,
            'default_ai_provider' => $provider,
            'default_ai_model' => in_array($model, (array) config("ai.selectable_models.{$provider}", []), true)
                ? $model
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

        return array_key_exists($provider, (array) config('ai.selectable_models', [])) ? $provider : 'openai';
    }

    private function defaultModel(string $provider): string
    {
        return (string) config("ai.selectable_models.{$provider}.0", 'gpt-4o-mini');
    }
}
