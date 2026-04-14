<?php

declare(strict_types=1);

namespace App\Http\Requests\UserSetting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateUserSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'default_domain_template_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')->where('user_id', $userId),
            ],
            'daily_new_limit' => ['sometimes', 'integer', 'min:0', 'max:500'],
            'daily_review_limit' => ['sometimes', 'integer', 'min:0', 'max:2000'],
            'default_ai_provider' => [
                'sometimes',
                'string',
                Rule::in(['openai', 'anthropic', 'google']),
            ],
            'default_ai_model' => ['sometimes', 'string', 'max:100'],
            'default_generation_count' => ['sometimes', 'integer', 'min:1', 'max:10'],
        ];
    }
}
