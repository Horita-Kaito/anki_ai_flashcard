<?php

declare(strict_types=1);

namespace App\Http\Requests\DomainTemplate;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateDomainTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'instruction_json' => ['sometimes', 'required', 'array'],
            'instruction_json.goal' => ['sometimes', 'required', 'string', 'max:500'],
            'instruction_json.priorities' => ['sometimes', 'required', 'array', 'min:1'],
            'instruction_json.priorities.*' => ['string', 'max:200'],
            'instruction_json.avoid' => ['sometimes', 'array'],
            'instruction_json.avoid.*' => ['string', 'max:200'],
            'instruction_json.preferred_card_types' => ['sometimes', 'array'],
            'instruction_json.preferred_card_types.*' => [
                'string',
                'in:basic_qa,comparison,practical_case,cloze_like',
            ],
            'instruction_json.answer_style' => ['sometimes', 'string', 'max:200'],
            'instruction_json.difficulty_policy' => ['sometimes', 'string', 'max:200'],
            'instruction_json.note_interpretation_policy' => ['sometimes', 'string', 'max:500'],
        ];
    }
}
