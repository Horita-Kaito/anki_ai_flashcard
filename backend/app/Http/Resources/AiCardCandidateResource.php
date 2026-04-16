<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AiCardCandidate;
use Illuminate\Http\Request;

/**
 * @mixin AiCardCandidate
 */
final class AiCardCandidateResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'note_seed_id' => $this->note_seed_id,
            'ai_generation_log_id' => $this->ai_generation_log_id,
            'provider' => $this->provider,
            'model_name' => $this->model_name,
            'question' => $this->question,
            'answer' => $this->answer,
            'card_type' => $this->card_type?->value,
            'focus_type' => $this->focus_type,
            'rationale' => $this->rationale,
            'confidence' => $this->confidence,
            'status' => $this->status?->value,
            'suggested_deck_id' => $this->suggested_deck_id,
            ...$this->timestamps(),
        ];
    }
}
