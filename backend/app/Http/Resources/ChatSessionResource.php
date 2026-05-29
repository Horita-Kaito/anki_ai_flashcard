<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ChatSession;
use Illuminate\Http\Request;

/**
 * @mixin ChatSession
 */
final class ChatSessionResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $messagesCount = $this->resource->getAttribute('messages_count');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'domain_template_id' => $this->domain_template_id,
            'deck_id' => $this->deck_id,
            'messages_count' => $messagesCount === null ? null : (int) $messagesCount,
            'messages' => $this->whenLoaded(
                'messages',
                fn () => ChatMessageResource::collection($this->messages)->toArray($request),
            ),
            ...$this->timestamps(),
        ];
    }
}
