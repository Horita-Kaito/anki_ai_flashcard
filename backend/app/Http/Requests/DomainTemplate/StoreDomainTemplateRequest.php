<?php

declare(strict_types=1);

namespace App\Http\Requests\DomainTemplate;

use Illuminate\Foundation\Http\FormRequest;

final class StoreDomainTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            // AI に渡す分野ヒント 1 行 (旧 instruction_json.goal の後継)。
            // 未入力の場合は AI には「分野ポリシー」ブロック自体が付与されない。
            'domain_hint' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'テンプレート名を入力してください',
            'name.max' => 'テンプレート名は255文字以内で入力してください',
            'domain_hint.max' => '分野ヒントは500文字以内で入力してください',
        ];
    }
}
