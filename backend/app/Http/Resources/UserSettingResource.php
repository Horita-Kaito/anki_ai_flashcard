<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\UserSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UserSetting
 */
final class UserSettingResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'default_domain_template_id' => $this->default_domain_template_id,
            'daily_new_limit' => $this->daily_new_limit,
            'daily_review_limit' => $this->daily_review_limit,
            'default_ai_provider' => $this->default_ai_provider,
            'default_ai_model' => $this->default_ai_model,
            'default_generation_count' => $this->default_generation_count,
        ];
    }
}
