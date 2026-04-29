<?php

declare(strict_types=1);

namespace App\Http\Requests\AiCardCandidate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class BatchAdoptRequest extends FormRequest
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
            'candidate_ids' => ['required', 'array', 'min:1', 'max:20', 'distinct'],
            'candidate_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('ai_card_candidates', 'id')->where('user_id', $userId),
            ],
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
            'candidate_ids.required' => '少なくとも1つの候補を選択してください',
            'candidate_ids.min' => '少なくとも1つの候補を選択してください',
            'candidate_ids.max' => '一度に採用できるのは20件までです',
        ];
    }
}
