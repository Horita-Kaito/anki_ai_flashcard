<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class OnboardingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'goals' => ['required', 'array', 'min:1'],
            'goals.*' => ['required', 'string', 'in:programming,language,exam,math_science,business,other'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'goals.required' => '学習目標を選択してください',
            'goals.min' => '学習目標を1つ以上選択してください',
            'goals.*.in' => '無効な学習目標が含まれています',
        ];
    }
}
