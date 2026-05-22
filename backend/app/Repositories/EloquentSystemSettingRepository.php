<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\SystemSettingRepositoryInterface;
use App\Models\SystemSetting;

final class EloquentSystemSettingRepository implements SystemSettingRepositoryInterface
{
    public function get(): SystemSetting
    {
        // マイグレーション時に id=1 を投入しているが、テスト等で migrate:fresh された
        // 直後の状態を保険的にカバーするため firstOrCreate を使う
        return SystemSetting::query()->firstOrCreate(
            ['id' => SystemSetting::SINGLETON_ID],
            ['monthly_token_limit' => null],
        );
    }

    public function update(array $attributes): SystemSetting
    {
        $setting = $this->get();
        $setting->update($attributes);

        return $setting->refresh();
    }
}
