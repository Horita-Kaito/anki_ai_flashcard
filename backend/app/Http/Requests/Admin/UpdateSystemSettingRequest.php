<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateSystemSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            // null = 無制限。0 も無制限として扱うが、UI からの誤入力防止のため
            // 値を入れる場合は最低 1000 トークン以上を要求する。
            'monthly_token_limit' => ['nullable', 'integer', 'min:1000', 'max:1000000000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'monthly_token_limit.min' => '月次トークン上限は 1000 以上で指定してください (無制限にするには空欄)',
            'monthly_token_limit.max' => '月次トークン上限が大きすぎます (1,000,000,000 以下)',
        ];
    }
}
