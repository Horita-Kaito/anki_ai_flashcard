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
            'default_ai_provider' => [
                'sometimes',
                'string',
                Rule::in(array_keys((array) config('ai.selectable_models', []))),
            ],
            'default_ai_model' => [
                'sometimes',
                'string',
                'max:100',
                Rule::in($this->selectableModels()),
            ],
            // FSRS 目標想起率: 0.7〜0.97 の範囲 (低すぎると効率悪化、高すぎると復習過多)
            'desired_retention' => ['sometimes', 'numeric', 'min:0.7', 'max:0.97'],
        ];
    }

    /** @return array<int, string> */
    private function selectableModels(): array
    {
        return collect((array) config('ai.selectable_models', []))
            ->flatten()
            ->values()
            ->all();
    }
}
