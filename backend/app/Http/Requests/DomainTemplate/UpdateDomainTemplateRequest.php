<?php

declare(strict_types=1);

namespace App\Http\Requests\DomainTemplate;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateDomainTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'domain_hint' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
