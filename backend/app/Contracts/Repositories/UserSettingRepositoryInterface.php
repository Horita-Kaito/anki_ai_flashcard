<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\UserSetting;

interface UserSettingRepositoryInterface
{
    public function findForUser(int $userId): ?UserSetting;

    public function createDefault(int $userId): UserSetting;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): UserSetting;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(UserSetting $setting, array $attributes): UserSetting;
}
