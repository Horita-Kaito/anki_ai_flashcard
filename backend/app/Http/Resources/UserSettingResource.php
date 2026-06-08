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
            'default_ai_model' => $this->normalizedModel($provider),
            'desired_retention' => $this->desired_retention !== null
                ? (float) $this->desired_retention
                : 0.9,
        ];
    }

    private function normalizedProvider(): string
    {
        return array_key_exists($this->default_ai_provider, (array) config('ai.selectable_models', []))
            ? $this->default_ai_provider
            : 'openai';
    }

    private function normalizedModel(string $provider): string
    {
        $models = (array) config("ai.selectable_models.{$provider}", []);

        return in_array($this->default_ai_model, $models, true)
            ? $this->default_ai_model
            : (string) ($models[0] ?? 'gpt-4o-mini');
    }
}
