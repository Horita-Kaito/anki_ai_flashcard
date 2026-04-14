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
        return UserSetting::create([
            'user_id' => $userId,
            'daily_new_limit' => 20,
            'daily_review_limit' => 100,
            'default_ai_provider' => config('ai.default_provider', 'openai'),
            'default_ai_model' => config('ai.default_model', 'gpt-4o-mini'),
            'default_generation_count' => (int) config('ai.generation.default_candidate_count', 3),
        ]);
    }

    public function update(UserSetting $setting, array $attributes): UserSetting
    {
        $setting->update($attributes);

        return $setting->refresh();
    }
}
