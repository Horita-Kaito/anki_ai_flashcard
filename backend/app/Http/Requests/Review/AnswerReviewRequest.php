<?php

declare(strict_types=1);

namespace App\Http\Requests\Review;

use App\Enums\ReviewRating;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AnswerReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'card_id' => ['required', 'integer'],
            'rating' => ['required', 'string', Rule::in(ReviewRating::values())],
            // 上限 1 時間。クライアントのタイマー異常 (放置・時計巻き戻り) による
            // 統計汚染と integer オーバーフローを防ぐ。
            'response_time_ms' => ['nullable', 'integer', 'min:0', 'max:3600000'],
        ];
    }
}
