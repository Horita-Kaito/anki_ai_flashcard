<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\ChatMessageRepositoryInterface;
use App\Models\ChatMessage;
use Illuminate\Support\Collection;

final class EloquentChatMessageRepository extends AbstractUserScopedEloquentRepository implements ChatMessageRepositoryInterface
{
    protected function modelClass(): string
    {
        return ChatMessage::class;
    }

    public function listForSession(int $userId, int $chatSessionId): Collection
    {
        return $this->userScopedQuery($userId)
            ->where('chat_session_id', $chatSessionId)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();
    }

    public function create(int $userId, int $chatSessionId, array $attributes): ChatMessage
    {
        /** @var ChatMessage */
        return $this->createOwnedBy($userId, [
            ...$attributes,
            'chat_session_id' => $chatSessionId,
        ]);
    }
}
