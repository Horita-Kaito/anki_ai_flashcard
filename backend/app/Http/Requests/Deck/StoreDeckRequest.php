<?php

declare(strict_types=1);

namespace App\Http\Requests\Deck;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreDeckRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'parent_id' => [
                'nullable',
                'integer',
                // 同一ユーザー所有のデッキに限定
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
            'default_domain_template_id' => ['nullable', 'integer'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'デッキ名を入力してください',
            'name.max' => 'デッキ名は255文字以内で入力してください',
            'description.max' => '説明は1000文字以内で入力してください',
            'parent_id.exists' => '指定された親デッキが存在しません',
        ];
    }
}
