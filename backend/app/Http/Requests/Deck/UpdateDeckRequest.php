<?php

declare(strict_types=1);

namespace App\Http\Requests\Deck;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateDeckRequest extends FormRequest
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
            'default_domain_template_id' => ['sometimes', 'nullable', 'integer'],
            'new_cards_limit' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'review_limit' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'デッキ名を入力してください',
            'name.max' => 'デッキ名は255文字以内で入力してください',
            'description.max' => '説明は1000文字以内で入力してください',
        ];
    }
}
