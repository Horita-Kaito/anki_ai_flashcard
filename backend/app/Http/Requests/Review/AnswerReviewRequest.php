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
            'response_time_ms' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
