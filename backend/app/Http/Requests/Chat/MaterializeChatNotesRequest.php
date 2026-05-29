<?php

declare(strict_types=1);

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class MaterializeChatNotesRequest extends FormRequest
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
            'domain_template_id' => [
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')->where('user_id', $userId),
            ],
            'deck_id' => [
                'nullable',
                'integer',
                Rule::exists('decks', 'id')->where('user_id', $userId),
            ],
        ];
    }
}
