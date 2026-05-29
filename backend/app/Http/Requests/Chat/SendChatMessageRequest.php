<?php

declare(strict_types=1);

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

final class SendChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:4000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'content.required' => '質問を入力してください',
            'content.max' => '質問は4000文字以内で入力してください',
        ];
    }
}
