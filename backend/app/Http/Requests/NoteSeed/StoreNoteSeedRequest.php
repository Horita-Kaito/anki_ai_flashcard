<?php

declare(strict_types=1);

namespace App\Http\Requests\NoteSeed;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreNoteSeedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
            'domain_template_id' => [
                'nullable',
                'integer',
                Rule::exists('domain_templates', 'id')
                    ->where('user_id', $this->user()->id),
            ],
            'subdomain' => ['nullable', 'string', 'max:255'],
            'learning_goal' => ['nullable', 'string', 'max:1000'],
            'note_context' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'body.required' => 'メモ本文を入力してください',
            'body.max' => 'メモは5000文字以内で入力してください',
            'domain_template_id.exists' => '指定された分野テンプレートが見つかりません',
        ];
    }

    protected function passedValidation(): void
    {
        if (is_string($this->input('body')) && trim($this->input('body')) === '') {
            $this->failedValidation(
                validator($this->all(), ['body' => ['required', 'string']])
                    ->after(fn ($v) => $v->errors()->add('body', 'メモ本文を入力してください'))
            );
        }
    }
}
