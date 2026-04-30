<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\UserSetting;
use Illuminate\Http\Request;

/**
 * @mixin UserSetting
 */
final class UserSettingResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'default_domain_template_id' => $this->default_domain_template_id,
            'default_ai_provider' => $this->default_ai_provider,
            'default_ai_model' => $this->default_ai_model,
            'default_generation_count' => $this->default_generation_count,
            'desired_retention' => $this->desired_retention !== null
                ? (float) $this->desired_retention
                : 0.9,
        ];
    }
}
