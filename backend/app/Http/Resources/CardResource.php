<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Card;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Card
 */
final class CardResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'deck_id' => $this->deck_id,
            'domain_template_id' => $this->domain_template_id,
            'source_note_seed_id' => $this->source_note_seed_id,
            'source_ai_candidate_id' => $this->source_ai_candidate_id,
            'question' => $this->question,
            'answer' => $this->answer,
            'explanation' => $this->explanation,
            'card_type' => $this->card_type?->value,
            'is_suspended' => $this->is_suspended,
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
            ])->values()),
            'schedule' => $this->whenLoaded('schedule', fn () => $this->schedule ? [
                'state' => $this->schedule->state?->value,
                'repetitions' => $this->schedule->repetitions,
                'interval_days' => $this->schedule->interval_days,
                'ease_factor' => (float) $this->schedule->ease_factor,
                'due_at' => $this->schedule->due_at?->toIso8601String(),
                'lapse_count' => $this->schedule->lapse_count,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
