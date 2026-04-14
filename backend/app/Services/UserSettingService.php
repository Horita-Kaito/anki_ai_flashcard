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

        return $this->repository->update($setting, $attributes);
    }
}
