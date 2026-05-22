<?php

declare(strict_types=1);

namespace App\Http\Requests\AiCardCandidate;

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
            'domain_template_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')
                    ->where('user_id', $this->user()->id),
            ],
        ];
    }
}
