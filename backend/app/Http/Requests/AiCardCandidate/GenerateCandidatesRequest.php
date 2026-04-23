<?php

declare(strict_types=1);

namespace App\Http\Requests\AiCardCandidate;

use App\Enums\CardType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class GenerateCandidatesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'count' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:10'],
            'domain_template_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')
                    ->where('user_id', $this->user()->id),
            ],
            'preferred_card_types' => ['sometimes', 'array'],
            'preferred_card_types.*' => ['string', Rule::in(CardType::values())],
        ];
    }
}
