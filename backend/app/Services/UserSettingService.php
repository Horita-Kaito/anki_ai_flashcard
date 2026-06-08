<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\UserSettingRepositoryInterface;
use App\Models\UserSetting;

final class UserSettingService
{
    public function __construct(
        private readonly UserSettingRepositoryInterface $repository,
    ) {}

    /**
     * 設定を取得。存在しなければデフォルトで自動作成する。
     */
    public function getOrCreateForUser(int $userId): UserSetting
    {
        $existing = $this->repository->findForUser($userId);

        return $existing ?? $this->repository->createDefault($userId);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateForUser(int $userId, array $attributes): UserSetting
    {
        $setting = $this->getOrCreateForUser($userId);
        $provider = (string) ($attributes['default_ai_provider'] ?? $setting->default_ai_provider);
        $models = (array) config("ai.selectable_models.{$provider}", []);
        $model = (string) ($attributes['default_ai_model'] ?? $setting->default_ai_model);
        if (! in_array($model, $models, true)) {
            $attributes['default_ai_model'] = (string) ($models[0] ?? 'gpt-4o-mini');
        }

        return $this->repository->update($setting, $attributes);
    }
}
