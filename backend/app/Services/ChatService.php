<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Contracts\Repositories\ChatMessageRepositoryInterface;
use App\Contracts\Repositories\ChatSessionRepositoryInterface;
use App\Contracts\Repositories\SystemSettingRepositoryInterface;
use App\Contracts\Services\AI\AiProviderInterface;
use App\Contracts\Services\ChatServiceInterface;
use App\Exceptions\Domain\AiGenerationFailedException;
use App\Exceptions\Domain\AiUsageLimitExceededException;
use App\Exceptions\Domain\ChatSessionNotFoundException;
use App\Exceptions\Domain\GenerationAlreadyInFlightException;
use App\Models\AiGenerationLog;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Services\AI\AiGenerationRequest;
use App\Services\AI\AiGenerationResult;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ChatService implements ChatServiceInterface
{
    public function __construct(
        private readonly ChatSessionRepositoryInterface $sessionRepository,
        private readonly ChatMessageRepositoryInterface $messageRepository,
        private readonly NoteSeedService $noteSeedService,
        private readonly CardGenerationService $generationService,
        private readonly AiGenerationLogRepositoryInterface $logRepository,
        private readonly SystemSettingRepositoryInterface $systemSettingRepository,
        private readonly AiProviderInterface $aiProvider,
    ) {}

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return $this->sessionRepository->paginateForUser($userId, $perPage);
    }

    public function getForUser(int $userId, int $chatSessionId): ChatSession
    {
        $session = $this->sessionRepository->findForUserWithMessages($userId, $chatSessionId);
        if ($session === null) {
            throw ChatSessionNotFoundException::make($chatSessionId);
        }

        return $session;
    }

    public function createForUser(int $userId, array $attributes): ChatSession
    {
        $title = $attributes['title'] ?? null;
        if (! is_string($title) || trim($title) === '') {
            $title = '新しい学習チャット';
        }

        return $this->sessionRepository->create($userId, [
            'title' => $title,
            'domain_template_id' => $attributes['domain_template_id'] ?? null,
            'deck_id' => $attributes['deck_id'] ?? null,
        ]);
    }

    public function sendMessage(int $userId, int $chatSessionId, string $content): array
    {
        $session = $this->sessionRepository->findForUser($userId, $chatSessionId);
        if ($session === null) {
            throw ChatSessionNotFoundException::make($chatSessionId);
        }

        $this->assertMonthlyTokenLimit($userId);

        $userMessage = $this->messageRepository->create($userId, $session->id, [
            'role' => 'user',
            'content' => $content,
        ]);

        $messages = $this->messageRepository->listForSession($userId, $session->id);
        $model = (string) config('ai.default_model', 'gpt-4o-mini');
        try {
            $result = $this->aiProvider->generate(new AiGenerationRequest(
                systemPrompt: $this->chatSystemPrompt(),
                userPrompt: $this->buildChatPrompt($messages),
                model: $model,
                temperature: 0.5,
                maxOutputTokens: 1800,
            ));
            $this->recordChatUsage($userId, 'chat-reply', $result);
            $assistantContent = trim($result->rawContent);
            $assistantMetadata = [
                'status' => 'success',
                'provider' => $result->provider,
                'model' => $result->model,
                'input_tokens' => $result->inputTokens,
                'output_tokens' => $result->outputTokens,
                'cost_usd' => $result->costUsd,
            ];
        } catch (AiGenerationFailedException $e) {
            $this->recordChatFailure($userId, $session->id, 'chat-reply', $model, $e);
            $assistantContent = $e->userMessage();
            $assistantMetadata = [
                'status' => 'failed',
                'provider' => $this->aiProvider->name(),
                'model' => $model,
                'error_code' => $e->errorCode(),
            ];
        }

        $assistantMessage = $this->messageRepository->create($userId, $session->id, [
            'role' => 'assistant',
            'content' => $assistantContent,
            'metadata' => $assistantMetadata,
        ]);

        if ($session->title === '新しい学習チャット') {
            $this->sessionRepository->update($session, [
                'title' => Str::limit(preg_replace('/\s+/', ' ', trim($content)) ?: '学習チャット', 48, ''),
            ]);
        } else {
            $this->sessionRepository->update($session, ['updated_at' => now()]);
        }

        return [
            'user_message' => $userMessage,
            'assistant_message' => $assistantMessage,
        ];
    }

    public function materializeNotesAndGenerate(int $userId, int $chatSessionId, array $options = []): array
    {
        $session = $this->getForUser($userId, $chatSessionId);
        $messages = $this->messageRepository->listForSession($userId, $session->id);
        $this->assertMonthlyTokenLimit($userId);
        $notePayloads = $this->extractNotes($userId, $session->id, $messages->all());

        if ($notePayloads === []) {
            $notePayloads[] = [
                'body' => $this->fallbackNoteBody($messages->all()),
                'learning_goal' => 'チャットで得た学びをカード化する',
                'note_context' => 'チャットから作成',
                'subdomain' => null,
            ];
        }

        $domainTemplateId = $options['domain_template_id'] ?? $session->domain_template_id;
        $defaultDeckId = $options['deck_id'] ?? $session->deck_id;
        $notes = DB::transaction(function () use ($userId, $notePayloads, $domainTemplateId) {
            $created = [];
            foreach ($notePayloads as $payload) {
                $created[] = $this->noteSeedService->createForUser($userId, [
                    'body' => $payload['body'],
                    'domain_template_id' => $domainTemplateId,
                    'subdomain' => $payload['subdomain'] ?? null,
                    'learning_goal' => $payload['learning_goal'] ?? 'チャットで得た学びを定着させる',
                    'note_context' => $payload['note_context'] ?? 'チャットから作成',
                ]);
            }

            return $created;
        });

        $dispatched = [];
        $skipped = [];
        $failed = [];
        foreach ($notes as $note) {
            try {
                $log = $this->generationService->dispatchGeneration($note, [
                    'domain_template_id' => $domainTemplateId,
                    'default_deck_id' => $defaultDeckId,
                    'regenerate' => false,
                    'additional' => false,
                ]);
                $dispatched[] = [
                    'note_seed_id' => $note->id,
                    'log_id' => $log->id,
                    'status' => $log->status,
                ];
            } catch (GenerationAlreadyInFlightException $e) {
                $skipped[] = [
                    'note_seed_id' => $note->id,
                    'reason' => $e->userMessage(),
                    'existing_log_id' => $e->existingLog->id,
                ];
            } catch (AiUsageLimitExceededException $e) {
                $failed[] = [
                    'note_seed_id' => $note->id,
                    'reason' => $e->userMessage(),
                    'code' => $e->errorCode(),
                ];
                break;
            } catch (\Throwable $e) {
                $failed[] = [
                    'note_seed_id' => $note->id,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        $this->sessionRepository->delete($session);

        return [
            'notes' => $notes,
            'dispatched' => $dispatched,
            'skipped' => $skipped,
            'failed' => $failed,
            'chat_session_deleted' => true,
        ];
    }

    public function deleteForUser(int $userId, int $chatSessionId): void
    {
        $session = $this->sessionRepository->findForUser($userId, $chatSessionId);
        if ($session === null) {
            throw ChatSessionNotFoundException::make($chatSessionId);
        }

        $this->sessionRepository->delete($session);
    }

    private function chatSystemPrompt(): string
    {
        return <<<'PROMPT'
You are a learning coach inside a flashcard app.
Answer the user's question accurately and concisely in Japanese unless the user asks otherwise.
Prefer explanations that expose definitions, contrasts, causes, procedures, exceptions, and examples that can later become flashcards.
When a useful learning point appears, end with a short suggestion that it can be turned into cards.
If the user switches to a completely different topic, answer normally but suggest starting a new chat before cardizing.
PROMPT;
    }

    /**
     * @param  Collection<int, ChatMessage>  $messages
     */
    private function buildChatPrompt($messages): string
    {
        return $messages
            ->map(fn (ChatMessage $message) => strtoupper($message->role).":\n".$message->content)
            ->implode("\n\n");
    }

    /**
     * @param  array<int, ChatMessage>  $messages
     * @return array<int, array{body: string, learning_goal?: string|null, note_context?: string|null, subdomain?: string|null}>
     */
    private function extractNotes(int $userId, int $chatSessionId, array $messages): array
    {
        $model = (string) config('ai.default_model', 'gpt-4o-mini');
        try {
            $result = $this->aiProvider->generate(new AiGenerationRequest(
                systemPrompt: 'You split a learning chat into flashcard-ready notes. Return only JSON.',
                userPrompt: $this->buildExtractionPrompt($messages),
                model: $model,
                temperature: 0.2,
                maxOutputTokens: 2200,
                jsonSchema: $this->aiProvider->supportsJsonSchema() ? $this->noteExtractionSchema() : null,
            ));
            $this->recordChatUsage($userId, 'chat-extract', $result);
        } catch (AiGenerationFailedException $e) {
            $this->recordChatFailure($userId, $chatSessionId, 'chat-extract', $model, $e);

            return [];
        }

        $decoded = json_decode($result->rawContent, true);
        if (! is_array($decoded) || ! isset($decoded['notes']) || ! is_array($decoded['notes'])) {
            return [];
        }

        $notes = [];
        foreach ($decoded['notes'] as $note) {
            if (! is_array($note) || ! isset($note['body']) || ! is_string($note['body'])) {
                continue;
            }
            $body = trim($note['body']);
            if ($body === '') {
                continue;
            }
            $notes[] = [
                'body' => Str::limit($body, 5000, ''),
                'learning_goal' => isset($note['learning_goal']) && is_string($note['learning_goal'])
                    ? Str::limit(trim($note['learning_goal']), 1000, '')
                    : null,
                'note_context' => isset($note['note_context']) && is_string($note['note_context'])
                    ? Str::limit(trim($note['note_context']), 2000, '')
                    : 'チャットから作成',
                'subdomain' => isset($note['subdomain']) && is_string($note['subdomain'])
                    ? Str::limit(trim($note['subdomain']), 255, '')
                    : null,
            ];
        }

        return array_slice($notes, 0, 10);
    }

    /**
     * @param  array<int, ChatMessage>  $messages
     */
    private function buildExtractionPrompt(array $messages): string
    {
        $transcript = collect($messages)
            ->map(fn (ChatMessage $message) => strtoupper($message->role).":\n".$message->content)
            ->implode("\n\n");

        return <<<PROMPT
次の学習チャットから、カード化しやすい独立したメモに分割してください。

要件:
- 1メモにつき1つの知識単位にする
- メモ本文にはカード作成に必要な定義、理由、手順、例外、比較軸を含める
- チャットにない事実を過剰に足さない
- 最大10件

JSON形式:
{"notes":[{"body":"...","learning_goal":"...","note_context":"チャットから作成","subdomain":"..."}]}

チャット:
{$transcript}
PROMPT;
    }

    /**
     * @return array<string, mixed>
     */
    private function noteExtractionSchema(): array
    {
        return [
            'name' => 'chat_note_extraction',
            'schema' => [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['notes'],
                'properties' => [
                    'notes' => [
                        'type' => 'array',
                        'maxItems' => 10,
                        'items' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => ['body', 'learning_goal', 'note_context', 'subdomain'],
                            'properties' => [
                                'body' => ['type' => 'string'],
                                'learning_goal' => ['type' => ['string', 'null']],
                                'note_context' => ['type' => ['string', 'null']],
                                'subdomain' => ['type' => ['string', 'null']],
                            ],
                        ],
                    ],
                ],
            ],
            'strict' => true,
        ];
    }

    /**
     * @param  array<int, ChatMessage>  $messages
     */
    private function fallbackNoteBody(array $messages): string
    {
        $body = collect($messages)
            ->filter(fn (ChatMessage $message) => $message->role !== 'system')
            ->map(fn (ChatMessage $message) => ($message->role === 'user' ? '質問: ' : '回答: ').$message->content)
            ->implode("\n\n");

        return Str::limit($body !== '' ? $body : 'チャットで得た学び', 5000, '');
    }

    private function assertMonthlyTokenLimit(int $userId): void
    {
        $limit = $this->systemSettingRepository->get()->effectiveMonthlyTokenLimit();
        if ($limit === null) {
            return;
        }

        $used = $this->logRepository->sumTokensForUserInPeriod(
            $userId,
            now()->startOfMonth(),
            now()->endOfMonth(),
        );
        if ($used >= $limit) {
            throw AiUsageLimitExceededException::monthlyTokenLimit($limit, $used);
        }
    }

    private function recordChatUsage(int $userId, string $purpose, AiGenerationResult $result): void
    {
        $this->logRepository->create([
            'user_id' => $userId,
            'note_seed_id' => null,
            'provider' => $result->provider,
            'model_name' => $result->model,
            'prompt_version' => $this->chatPromptVersion($purpose),
            'input_tokens' => $result->inputTokens,
            'output_tokens' => $result->outputTokens,
            'cost_usd' => $result->costUsd,
            'duration_ms' => $result->durationMs,
            'status' => AiGenerationLog::STATUS_SUCCESS,
            'error_reason' => null,
            'candidates_count' => 0,
        ]);
    }

    private function recordChatFailure(
        int $userId,
        int $chatSessionId,
        string $purpose,
        string $model,
        AiGenerationFailedException $exception,
    ): void {
        $this->logRepository->create([
            'user_id' => $userId,
            'note_seed_id' => null,
            'provider' => $this->aiProvider->name(),
            'model_name' => $model,
            'prompt_version' => $this->chatPromptVersion($purpose),
            'input_tokens' => 0,
            'output_tokens' => 0,
            'cost_usd' => 0,
            'duration_ms' => 0,
            'status' => AiGenerationLog::STATUS_FAILED,
            'error_reason' => mb_substr('['.($exception->errorCode() ?? 'GENERIC').'] chat_session_id='.$chatSessionId, 0, 2000),
            'candidates_count' => 0,
        ]);
    }

    private function chatPromptVersion(string $purpose): string
    {
        return Str::limit($purpose.':'.(string) config('ai.prompt_version', 'v1'), 20, '');
    }
}
