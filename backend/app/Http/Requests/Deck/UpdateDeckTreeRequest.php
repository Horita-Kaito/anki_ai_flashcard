<?php

declare(strict_types=1);

namespace App\Http\Requests\Deck;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateDeckTreeRequest extends FormRequest
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
            'nodes' => ['required', 'array', 'min:1'],
            'nodes.*.id' => [
                'required',
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
            'nodes.*.parent_id' => [
                'nullable',
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
            'nodes.*.display_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
