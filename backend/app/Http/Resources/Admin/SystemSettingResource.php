<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\BaseJsonResource;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

/**
 * @mixin SystemSetting
 */
final class SystemSettingResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'monthly_token_limit' => $this->monthly_token_limit,
            ...$this->timestamps(),
        ];
    }
}
