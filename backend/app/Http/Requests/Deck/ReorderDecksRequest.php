<?php

declare(strict_types=1);

namespace App\Http\Requests\Deck;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ReorderDecksRequest extends FormRequest
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
            'deck_ids' => ['required', 'array', 'min:1'],
            'deck_ids.*' => [
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
        ];
    }
}
