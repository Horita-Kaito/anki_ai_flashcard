<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\SystemSetting;

interface SystemSettingRepositoryInterface
{
    /**
     * シングルトン行 (id=1) を取得する。存在しなければデフォルト値で作成する。
     */
    public function get(): SystemSetting;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(array $attributes): SystemSetting;
}
