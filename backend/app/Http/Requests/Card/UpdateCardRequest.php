<?php

declare(strict_types=1);

namespace App\Http\Requests\Card;

use App\Enums\CardType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCardRequest extends FormRequest
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
                'sometimes',
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
            'question' => ['sometimes', 'required', 'string', 'max:2000'],
            'answer' => ['sometimes', 'required', 'string', 'max:2000'],
            'explanation' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'card_type' => ['sometimes', Rule::in(CardType::values())],
            'is_suspended' => ['sometimes', 'boolean'],
            'tag_ids' => ['sometimes', 'array'],
            'tag_ids.*' => [
                'integer',
                Rule::exists('tags', 'id')->where('user_id', $userId),
            ],
        ];
    }
}
