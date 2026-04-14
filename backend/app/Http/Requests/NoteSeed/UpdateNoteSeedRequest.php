<?php

declare(strict_types=1);

namespace App\Http\Requests\NoteSeed;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateNoteSeedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'body' => ['sometimes', 'required', 'string', 'max:5000'],
            'domain_template_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')
                    ->where('user_id', $this->user()->id),
            ],
            'subdomain' => ['sometimes', 'nullable', 'string', 'max:255'],
            'learning_goal' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'note_context' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
