<?php

declare(strict_types=1);

namespace App\Http\Requests\AiCardCandidate;

use App\Enums\CardType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * 複数メモに対する一括生成リクエスト。
 * AI 課金が瞬間的に走るため、1 リクエストで dispatch できる件数に上限を設ける。
 */
final class BulkGenerateCandidatesRequest extends FormRequest
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
            'note_seed_ids' => ['required', 'array', 'min:1', 'max:10', 'distinct'],
            'note_seed_ids.*' => [
                'integer',
                Rule::exists('note_seeds', 'id')->where('user_id', $userId),
            ],
            'count' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10'],
            'domain_template_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')->where('user_id', $userId),
            ],
            'preferred_card_types' => ['sometimes', 'array'],
            'preferred_card_types.*' => ['string', Rule::in(CardType::values())],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'note_seed_ids.required' => 'メモを少なくとも 1 件選択してください',
            'note_seed_ids.min' => 'メモを少なくとも 1 件選択してください',
            'note_seed_ids.max' => '一度に生成できるのは 10 件までです',
        ];
    }
}
