<?php

declare(strict_types=1);

namespace App\Http\Requests\Deck;

use Illuminate\Foundation\Http\FormRequest;

final class StoreDeckRequest extends FormRequest
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
            'default_domain_template_id' => ['nullable', 'integer'],
            'new_cards_limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'review_limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'デッキ名を入力してください',
            'name.max' => 'デッキ名は255文字以内で入力してください',
            'description.max' => '説明は1000文字以内で入力してください',
            'new_cards_limit.min' => '新規カード上限は1以上で指定してください',
            'new_cards_limit.max' => '新規カード上限は100以下で指定してください',
        ];
    }
}
