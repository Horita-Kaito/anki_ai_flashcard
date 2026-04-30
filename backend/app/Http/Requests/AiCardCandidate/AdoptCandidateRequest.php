<?php

declare(strict_types=1);

namespace App\Http\Requests\AiCardCandidate;

use App\Models\Card;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AdoptCandidateRequest extends FormRequest
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
            'question' => ['sometimes', 'string', 'max:2000'],
            'answer' => ['sometimes', 'string', 'max:2000'],
            'explanation' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'scheduler' => ['sometimes', Rule::in(Card::schedulers())],
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
            'deck_id.required' => '採用先のデッキを選択してください',
            'deck_id.exists' => '指定されたデッキが見つかりません',
        ];
    }
}
