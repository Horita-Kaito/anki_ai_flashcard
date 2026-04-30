<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Contracts\Repositories\DeckRepositoryInterface;
use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Contracts\Services\AI\AiProviderInterface;
use App\Enums\CandidateStatus;
use App\Exceptions\Domain\AiGenerationFailedException;
use App\Exceptions\Domain\AiUsageLimitExceededException;
use App\Exceptions\Domain\GenerationAlreadyInFlightException;
use App\Jobs\GenerateCardCandidatesJob;
use App\Models\AiCardCandidate;
use App\Models\AiGenerationLog;
use App\Models\NoteSeed;
use App\Services\AI\AiGenerationRequest;
use App\Services\AI\AiGenerationResult;
use App\Services\AI\CandidateParser;
use App\Services\AI\PromptBuilder;
use Illuminate\Support\Facades\DB;

/**
 * メモから AI 候補を生成する中核サービス。
 *
 * 非同期化された処理フロー:
 *   - dispatchGeneration: 日次使用量チェック → 同時生成チェック → queued log 作成 → Job ディスパッチ
 *   - runGeneration (Job 内で実行):
 *       1. log を processing に遷移
 *       2. プロンプト組立 + AI 呼び出し
 *       3. JSON パース (失敗時は log を failed に)
 *       4. AiCardCandidate を DB に保存
 *       5. log を success に遷移 (コスト・トークン記録)
 */
final class CardGenerationService
{
    public function __construct(
        private readonly AiProviderInterface $aiProvider,
        private readonly AiCardCandidateRepositoryInterface $candidateRepository,
        private readonly AiGenerationLogRepositoryInterface $logRepository,
        private readonly DomainTemplateRepositoryInterface $templateRepository,
        private readonly DeckRepositoryInterface $deckRepository,
        private readonly PromptBuilder $promptBuilder,
        private readonly CandidateParser $parser,
    ) {}

    /**
     * 生成ジョブをディスパッチして queued log を返す (同期実行はしない)。
     *
     * @param  array{count?: int|null, preferred_card_types?: array<int, string>, domain_template_id?: int|null, regenerate?: bool, additional?: bool}  $options
     *
     * @throws AiUsageLimitExceededException
     * @throws GenerationAlreadyInFlightException
     */
    public function dispatchGeneration(NoteSeed $note, array $options = []): AiGenerationLog
    {
        $this->assertDailyLimit($note->user_id);

        $existing = $this->logRepository->findInFlightForNote($note->user_id, $note->id);
        if ($existing !== null) {
            throw new GenerationAlreadyInFlightException($existing);
        }

        $log = $this->logRepository->create([
            'user_id' => $note->user_id,
            'note_seed_id' => $note->id,
            // 実プロバイダ・モデル名は Job 実行時に確定する
            'provider' => 'pending',
            'model_name' => (string) config('ai.default_model', 'gpt-4o-mini'),
            'prompt_version' => $this->promptBuilder->promptVersion(),
            'status' => AiGenerationLog::STATUS_QUEUED,
            'candidates_count' => 0,
        ]);

        // options から不要キーを削ぎ落として serialize しやすくする
        $payload = [
            'count' => $options['count'] ?? null,
            'preferred_card_types' => $options['preferred_card_types'] ?? null,
            'domain_template_id' => $options['domain_template_id'] ?? null,
            'regenerate' => (bool) ($options['regenerate'] ?? false),
            'additional' => (bool) ($options['additional'] ?? false),
        ];

        GenerateCardCandidatesJob::dispatch($log->id, $payload);

        return $log->refresh();
    }

    /**
     * Job から呼ばれる本処理。queued log を受け取り、AI 呼び出し → 候補保存 → log 完了マークまで行う。
     *
     * @param  array{count?: int|null, preferred_card_types?: array<int, string>|null, domain_template_id?: int|null, regenerate?: bool, additional?: bool}  $options
     * @return array<int, AiCardCandidate>
     *
     * @throws AiGenerationFailedException
     */
    public function runGeneration(AiGenerationLog $log, array $options): array
    {
        $log = $this->logRepository->update($log, ['status' => AiGenerationLog::STATUS_PROCESSING]);

        /** @var NoteSeed|null $note */
        $note = NoteSeed::query()->find($log->note_seed_id);
        if ($note === null || $note->user_id !== $log->user_id) {
            $this->markFailed($log, '[NOTE_NOT_FOUND]', 'note_seed_id='.$log->note_seed_id);

            return [];
        }

        $template = $this->resolveTemplate($note, $options);
        $count = $this->clampCount($options['count'] ?? null, $note->body);
        $regenerate = (bool) ($options['regenerate'] ?? false);
        $additional = (bool) ($options['additional'] ?? false);

        $decks = $this->deckRepository->idsAndNamesForUser($note->user_id);
        $existingQuestions = $additional
            ? $this->candidateRepository
                ->listForNoteSeed($note->user_id, $note->id, null)
                ->pluck('question')
                ->all()
            : [];

        $request = new AiGenerationRequest(
            systemPrompt: $this->promptBuilder->systemPrompt($template, $decks),
            userPrompt: $this->promptBuilder->userPrompt($note, [
                'count' => $count,
                'preferred_card_types' => $options['preferred_card_types'] ?? null,
                'existing_questions' => $existingQuestions,
                'additional' => $additional,
            ]),
            model: (string) config('ai.default_model', 'gpt-4o-mini'),
            temperature: (float) config('ai.generation.temperature', 0.6),
            maxOutputTokens: (int) config('ai.generation.max_output_tokens', 2000),
        );

        try {
            $result = $this->callWithRetry($request);
        } catch (AiGenerationFailedException $e) {
            $this->markFailed($log, '['.($e->errorCode() ?? 'CALL_FAILED').']', $e->debugDetail() ?? $e->getMessage());

            throw $e;
        }

        // パース失敗時はトークン情報を保存した上で failed
        try {
            $parseResult = $this->parser->parse($result->rawContent);
        } catch (AiGenerationFailedException $parseError) {
            $this->logRepository->update($log, [
                'provider' => $result->provider,
                'model_name' => $result->model,
                'input_tokens' => $result->inputTokens,
                'output_tokens' => $result->outputTokens,
                'cost_usd' => $result->costUsd,
                'duration_ms' => $result->durationMs,
                'status' => AiGenerationLog::STATUS_FAILED,
                'error_reason' => mb_substr(
                    sprintf(
                        '[%s] %s',
                        $parseError->errorCode() ?? 'PARSE_ERROR',
                        $parseError->debugDetail() ?? $parseError->getMessage(),
                    ),
                    0,
                    2000,
                ),
                'candidates_count' => 0,
            ]);

            throw $parseError;
        }

        $parsed = $parseResult->items;
        $deckIds = array_column($decks, 'id');

        try {
            $candidates = DB::transaction(function () use ($note, $result, $parsed, $log, $regenerate, $deckIds) {
                if ($regenerate) {
                    $this->candidateRepository->rejectPendingForNoteSeed($note->user_id, $note->id);
                }

                $candidates = [];
                foreach ($parsed as $data) {
                    $candidates[] = $this->candidateRepository->create($note->user_id, [
                        'note_seed_id' => $note->id,
                        'ai_generation_log_id' => $log->id,
                        'provider' => $result->provider,
                        'model_name' => $result->model,
                        'question' => $data['question'],
                        'answer' => $data['answer'],
                        'card_type' => $data['card_type'],
                        'focus_type' => $data['focus_type'],
                        'rationale' => $data['rationale'],
                        'explanation' => $data['explanation'],
                        'confidence' => $data['confidence'],
                        'suggested_deck_id' => in_array($data['suggested_deck_id'] ?? null, $deckIds, true)
                            ? $data['suggested_deck_id']
                            : null,
                        'status' => CandidateStatus::Pending->value,
                        'raw_response' => $data,
                    ]);
                }

                return $candidates;
            });
        } catch (\Throwable $e) {
            $this->logRepository->update($log, [
                'provider' => $result->provider,
                'model_name' => $result->model,
                'input_tokens' => $result->inputTokens,
                'output_tokens' => $result->outputTokens,
                'cost_usd' => $result->costUsd,
                'duration_ms' => $result->durationMs,
                'status' => AiGenerationLog::STATUS_FAILED,
                'error_reason' => mb_substr('[CANDIDATE_SAVE_FAILED] '.$e->getMessage(), 0, 2000),
                'candidates_count' => 0,
            ]);

            throw $e;
        }

        $this->logRepository->update($log, [
            'provider' => $result->provider,
            'model_name' => $result->model,
            'input_tokens' => $result->inputTokens,
            'output_tokens' => $result->outputTokens,
            'cost_usd' => $result->costUsd,
            'duration_ms' => $result->durationMs,
            'status' => AiGenerationLog::STATUS_SUCCESS,
            'error_reason' => $parseResult->truncated
                ? mb_substr('[PARTIAL] '.($parseResult->debugDetail ?? ''), 0, 2000)
                : null,
            'candidates_count' => count($parsed),
        ]);

        return $candidates;
    }

    private function markFailed(AiGenerationLog $log, string $code, string $detail): void
    {
        $this->logRepository->update($log, [
            'status' => AiGenerationLog::STATUS_FAILED,
            'error_reason' => mb_substr($code.' '.$detail, 0, 2000),
        ]);
    }

    private function assertDailyLimit(int $userId): void
    {
        $limit = (int) config('ai.limits.daily_generation_calls', 0);
        if ($limit <= 0) {
            return;
        }
        $count = $this->logRepository->countForUserInPeriod(
            $userId,
            now()->startOfDay(),
            now()->endOfDay(),
        );
        if ($count >= $limit) {
            throw AiUsageLimitExceededException::dailyLimit($limit);
        }
    }

    private function resolveTemplate(NoteSeed $note, array $options)
    {
        $templateId = $options['domain_template_id'] ?? $note->domain_template_id;
        if ($templateId === null) {
            return null;
        }

        return $this->templateRepository->findForUser($note->user_id, (int) $templateId);
    }

    /**
     * count が明示指定されていない場合はメモ本文長から自動算出する。
     * 目安: 200 文字ごとに +1 枚、3〜max_candidate_count の範囲にクランプ。
     */
    private function clampCount(mixed $raw, ?string $body = null): int
    {
        $max = (int) config('ai.generation.max_candidate_count', 10);

        if ($raw !== null && $raw !== '') {
            return max(1, min($max, (int) $raw));
        }

        $default = (int) config('ai.generation.default_candidate_count', 3);
        if ($body === null || $body === '') {
            return max(1, min($max, $default));
        }

        $estimated = (int) ceil(mb_strlen($body) / 200);

        return max($default, min($max, $estimated));
    }

    /**
     * AI 呼び出しを max_retries 回までリトライする。
     */
    private function callWithRetry(AiGenerationRequest $request): AiGenerationResult
    {
        $maxRetries = (int) config('ai.generation.max_retries', 2);
        $attempt = 0;
        $lastException = null;

        while ($attempt <= $maxRetries) {
            try {
                return $this->aiProvider->generate($request);
            } catch (\Throwable $e) {
                $lastException = $e;
                $attempt++;
            }
        }

        if ($lastException instanceof AiGenerationFailedException) {
            throw $lastException;
        }

        throw AiGenerationFailedException::generic(
            $lastException?->getMessage() ?? 'unknown error'
        );
    }
}
