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
        $provider = $this->normalizedProvider();

        return [
            'default_domain_template_id' => $this->default_domain_template_id,
            'default_ai_provider' => $provider,
            'default_ai_model' => $provider === $this->default_ai_provider
                ? $this->default_ai_model
                : $this->defaultModel($provider),
            'desired_retention' => $this->desired_retention !== null
                ? (float) $this->desired_retention
                : 0.9,
        ];
    }

    private function normalizedProvider(): string
    {
        return in_array($this->default_ai_provider, ['openai', 'google'], true)
            ? $this->default_ai_provider
            : 'openai';
    }

    private function defaultModel(string $provider): string
    {
        return match ($provider) {
            'google' => 'gemini-2.5-flash',
            default => 'gpt-4o-mini',
        };
    }
}
