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
use App\Models\AiCardCandidate;
use App\Models\NoteSeed;
use App\Services\AI\AiGenerationRequest;
use App\Services\AI\AiGenerationResult;
use App\Services\AI\CandidateParser;
use App\Services\AI\PromptBuilder;
use Illuminate\Support\Facades\DB;

/**
 * メモから AI 候補を生成する中核サービス。
 *
 * 処理フロー:
 *   1. 日次使用量チェック (limit 到達なら例外)
 *   2. プロンプト組立 (メモ + テンプレート + オプション)
 *   3. AI プロバイダ呼び出し
 *   4. JSON パース (失敗時リトライ、失敗してもログは残す)
 *   5. AiGenerationLog 保存 (成功/失敗両方)
 *   6. AiCardCandidate を DB に保存 (成功時のみ)
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
     * @param  array{count?: int|null, preferred_card_types?: array<int, string>, domain_template_id?: int, regenerate?: bool, additional?: bool}  $options
     * @return array<int, AiCardCandidate>
     *
     * @throws AiGenerationFailedException
     * @throws AiUsageLimitExceededException
     */
    public function generate(NoteSeed $note, array $options = []): array
    {
        $this->assertDailyLimit($note->user_id);

        $template = $this->resolveTemplate($note, $options);
        $count = $this->clampCount($options['count'] ?? null, $note->body);
        $model = (string) config('ai.default_model', 'gpt-4o-mini');
        $promptVersion = $this->promptBuilder->promptVersion();
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
            model: $model,
            temperature: (float) config('ai.generation.temperature', 0.6),
            maxOutputTokens: (int) config('ai.generation.max_output_tokens', 2000),
        );

        /** @var AiGenerationResult $result */
        $result = $this->callWithRetry($request);

        // JSON パース (リトライ済みの最終応答を)。失敗時は AiGenerationFailedException が投げられる。
        try {
            $parseResult = $this->parser->parse($result->rawContent);
        } catch (AiGenerationFailedException $parseError) {
            $this->logRepository->create([
                'user_id' => $note->user_id,
                'note_seed_id' => $note->id,
                'provider' => $result->provider,
                'model_name' => $result->model,
                'prompt_version' => $promptVersion,
                'input_tokens' => $result->inputTokens,
                'output_tokens' => $result->outputTokens,
                'cost_usd' => $result->costUsd,
                'duration_ms' => $result->durationMs,
                'status' => 'failed',
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

        // ログはトランザクション外で保存 (失敗時もロールバックされないようにする)
        $log = $this->logRepository->create([
            'user_id' => $note->user_id,
            'note_seed_id' => $note->id,
            'provider' => $result->provider,
            'model_name' => $result->model,
            'prompt_version' => $promptVersion,
            'input_tokens' => $result->inputTokens,
            'output_tokens' => $result->outputTokens,
            'cost_usd' => $result->costUsd,
            'duration_ms' => $result->durationMs,
            'status' => 'success',
            'error_reason' => $parseResult->truncated
                ? mb_substr('[PARTIAL] '.($parseResult->debugDetail ?? ''), 0, 2000)
                : null,
            'candidates_count' => count($parsed),
        ]);

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
            // 候補保存に失敗した場合、status=success のまま放置すると不整合になるため failed に直す。
            // ログ自体は AI 呼び出しのコスト記録として残す (cost_usd は保持)。
            $this->logRepository->update($log, [
                'status' => 'failed',
                'error_reason' => mb_substr('[CANDIDATE_SAVE_FAILED] '.$e->getMessage(), 0, 2000),
                'candidates_count' => 0,
            ]);

            throw $e;
        }

        return [
            'candidates' => $candidates,
            'meta' => [
                'model' => $result->model,
                'provider' => $result->provider,
                'input_tokens' => $result->inputTokens,
                'output_tokens' => $result->outputTokens,
                'cost_usd' => $result->costUsd,
                'duration_ms' => $result->durationMs,
            ],
        ];
    }

    private function assertDailyLimit(int $userId): void
    {
        $limit = (int) config('ai.limits.daily_generation_calls', 0);
        // limit <= 0 は無制限
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
     * 例外は最後に握りつぶさずに throw する。
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
