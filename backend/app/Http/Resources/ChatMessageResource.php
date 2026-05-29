<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ChatMessage;
use Illuminate\Http\Request;

/**
 * @mixin ChatMessage
 */
final class ChatMessageResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'chat_session_id' => $this->chat_session_id,
            'role' => $this->role,
            'content' => $this->content,
            'metadata' => $this->metadata,
            ...$this->timestamps(),
        ];
    }
}
