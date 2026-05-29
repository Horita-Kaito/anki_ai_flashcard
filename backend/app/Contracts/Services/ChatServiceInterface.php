<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\NoteSeed;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface ChatServiceInterface
{
    /** @return LengthAwarePaginator<int, ChatSession> */
    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator;

    public function getForUser(int $userId, int $chatSessionId): ChatSession;

    /** @param array<string, mixed> $attributes */
    public function createForUser(int $userId, array $attributes): ChatSession;

    /**
     * @return array{user_message: ChatMessage, assistant_message: ChatMessage}
     */
    public function sendMessage(int $userId, int $chatSessionId, string $content): array;

    /**
     * @param  array{domain_template_id?: int|null, deck_id?: int|null}  $options
     * @return array{notes: array<int, NoteSeed>, dispatched: array<int, array<string, mixed>>, skipped: array<int, array<string, mixed>>, failed: array<int, array<string, mixed>>, chat_session_deleted: bool}
     */
    public function materializeNotesAndGenerate(int $userId, int $chatSessionId, array $options = []): array;

    public function deleteForUser(int $userId, int $chatSessionId): void;
}
