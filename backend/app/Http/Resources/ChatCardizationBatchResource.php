<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ChatCardizationBatch;
use Illuminate\Http\Request;

/**
 * @mixin ChatCardizationBatch
 */
final class ChatCardizationBatchResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source_chat_session_id' => $this->source_chat_session_id,
            'source_chat_session_title' => $this->source_chat_session_title,
            'domain_template_id' => $this->domain_template_id,
            'deck_id' => $this->deck_id,
            'notes_count' => $this->notes_count,
            'dispatched_count' => $this->dispatched_count,
            'failed_count' => $this->failed_count,
            'status' => $this->status,
            'notes' => $this->whenLoaded(
                'noteSeeds',
                fn () => NoteSeedResource::collection($this->noteSeeds)->toArray($request),
            ),
            ...$this->timestamps(),
        ];
    }
}
