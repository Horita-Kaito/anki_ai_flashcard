<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\ChatSession;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ChatSessionRepositoryInterface
{
    public function findForUser(int $userId, int $chatSessionId): ?ChatSession;

    public function findForUserForUpdate(int $userId, int $chatSessionId): ?ChatSession;

    public function findForUserWithMessages(int $userId, int $chatSessionId): ?ChatSession;

    /** @return LengthAwarePaginator<int, ChatSession> */
    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator;

    /** @param array<string, mixed> $attributes */
    public function create(int $userId, array $attributes): ChatSession;

    /** @param array<string, mixed> $attributes */
    public function update(ChatSession $session, array $attributes): ChatSession;

    public function delete(ChatSession $session): void;
}
