<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\ChatSessionRepositoryInterface;
use App\Models\ChatSession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class EloquentChatSessionRepository extends AbstractUserScopedEloquentRepository implements ChatSessionRepositoryInterface
{
    protected function modelClass(): string
    {
        return ChatSession::class;
    }

    public function findForUser(int $userId, int $chatSessionId): ?ChatSession
    {
        /** @var ChatSession|null */
        return $this->userScopedQuery($userId)->where('id', $chatSessionId)->first();
    }

    public function findForUserForUpdate(int $userId, int $chatSessionId): ?ChatSession
    {
        /** @var ChatSession|null */
        return $this->userScopedQuery($userId)
            ->where('id', $chatSessionId)
            ->lockForUpdate()
            ->first();
    }

    public function findForUserWithMessages(int $userId, int $chatSessionId): ?ChatSession
    {
        /** @var ChatSession|null */
        return $this->userScopedQuery($userId)
            ->with(['messages' => fn ($q) => $q->orderBy('created_at')->orderBy('id')])
            ->where('id', $chatSessionId)
            ->first();
    }

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return $this->userScopedQuery($userId)
            ->whereNull('materialized_at')
            ->withCount('messages')
            ->orderByDesc('updated_at')
            ->paginate($perPage);
    }

    public function create(int $userId, array $attributes): ChatSession
    {
        /** @var ChatSession */
        return $this->createOwnedBy($userId, $attributes);
    }

    public function update(ChatSession $session, array $attributes): ChatSession
    {
        /** @var ChatSession */
        return $this->applyUpdate($session, $attributes);
    }

    public function delete(ChatSession $session): void
    {
        $session->delete();
    }
}
