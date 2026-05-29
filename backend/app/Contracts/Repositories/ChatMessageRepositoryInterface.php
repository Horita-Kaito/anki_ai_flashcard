<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\ChatMessage;
use Illuminate\Support\Collection;

interface ChatMessageRepositoryInterface
{
    /**
     * @return Collection<int, ChatMessage>
     */
    public function listForSession(int $userId, int $chatSessionId): Collection;

    /** @param array<string, mixed> $attributes */
    public function create(int $userId, int $chatSessionId, array $attributes): ChatMessage;
}
