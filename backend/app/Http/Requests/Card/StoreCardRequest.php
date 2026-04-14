<?php

declare(strict_types=1);

namespace App\Http\Requests\Card;

use App\Enums\CardType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreCardRequest extends FormRequest
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
            'deck_id' => [
                'required',
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
            'question' => ['required', 'string', 'max:2000'],
            'answer' => ['required', 'string', 'max:2000'],
            'explanation' => ['nullable', 'string', 'max:5000'],
            'card_type' => ['required', Rule::in(CardType::values())],
            'is_suspended' => ['sometimes', 'boolean'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => [
                'integer',
                Rule::exists('tags', 'id')->where('user_id', $userId),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'deck_id.required' => 'デッキを選択してください',
            'deck_id.exists' => '指定されたデッキが見つかりません',
            'question.required' => '問題文を入力してください',
            'answer.required' => '回答を入力してください',
            'card_type.in' => 'カード種別が不正です',
        ];
    }
}
