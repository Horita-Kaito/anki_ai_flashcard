<?php

declare(strict_types=1);

namespace App\Http\Requests\DomainTemplate;

use Illuminate\Foundation\Http\FormRequest;

final class StoreDomainTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'instruction_json' => ['required', 'array'],
            'instruction_json.goal' => ['required', 'string', 'max:500'],
            'instruction_json.priorities' => ['required', 'array', 'min:1'],
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

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'テンプレート名を入力してください',
            'name.max' => 'テンプレート名は255文字以内で入力してください',
            'instruction_json.required' => '策問ポリシーを入力してください',
            'instruction_json.goal.required' => '学習目的を入力してください',
            'instruction_json.priorities.required' => '優先観点を1つ以上入力してください',
            'instruction_json.priorities.min' => '優先観点を1つ以上入力してください',
        ];
    }
}
