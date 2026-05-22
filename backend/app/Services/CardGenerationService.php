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
use App\Services\AI\ChunkSplitter;
use App\Services\AI\PromptBuilder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
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
        private readonly ChunkSplitter $chunkSplitter,
    ) {}

    /**
     * 生成ジョブをディスパッチして queued log を返す (同期実行はしない)。
     *
     * 本文長に応じてチャンク分割を行う:
     *   - 1 chunk: 従来通り単一ログ + 単一 Job
     *   - N chunks: 親ログ 1 件 + 子ログ N 件、各子に対して Job を dispatch
     *
     * @param  array{domain_template_id?: int|null, regenerate?: bool, additional?: bool}  $options
     *
     * @throws AiUsageLimitExceededException
     * @throws GenerationAlreadyInFlightException
     */
    public function dispatchGeneration(NoteSeed $note, array $options = []): AiGenerationLog
    {
        $this->assertMonthlyTokenLimit($note->user_id);

        $existing = $this->logRepository->findInFlightForNote($note->user_id, $note->id);
        if ($existing !== null) {
            throw new GenerationAlreadyInFlightException($existing);
        }

        $chunks = $this->chunkSplitter->split((string) $note->body);
        $chunksTotal = count($chunks);
        $model = (string) config('ai.default_model', 'gpt-4o-mini');
        $regenerate = (bool) ($options['regenerate'] ?? false);
        $additional = (bool) ($options['additional'] ?? false);
        $domainTemplateId = $options['domain_template_id'] ?? null;

        if ($chunksTotal <= 1) {
            // 単一チャンク: 従来通り
            $log = $this->logRepository->create([
                'user_id' => $note->user_id,
                'note_seed_id' => $note->id,
                'provider' => 'pending',
                'model_name' => $model,
                'prompt_version' => $this->promptBuilder->promptVersion(),
                'status' => AiGenerationLog::STATUS_QUEUED,
                'candidates_count' => 0,
            ]);

            GenerateCardCandidatesJob::dispatch($log->id, [
                'domain_template_id' => $domainTemplateId,
                'regenerate' => $regenerate,
                'additional' => $additional,
                'chunk_text' => $chunks[0] ?? (string) $note->body,
            ]);

            return $log->refresh();
        }

        // 複数チャンク: 親ログ + 子ログを作成
        $parent = $this->logRepository->create([
            'user_id' => $note->user_id,
            'note_seed_id' => $note->id,
            'provider' => 'pending',
            'model_name' => $model,
            'prompt_version' => $this->promptBuilder->promptVersion(),
            'status' => AiGenerationLog::STATUS_QUEUED,
            'candidates_count' => 0,
            'chunks_total' => $chunksTotal,
        ]);

        foreach ($chunks as $i => $chunkText) {
            $child = $this->logRepository->create([
                'user_id' => $note->user_id,
                'note_seed_id' => $note->id,
                'parent_log_id' => $parent->id,
                'chunk_index' => $i,
                'chunks_total' => $chunksTotal,
                'provider' => 'pending',
                'model_name' => $model,
                'prompt_version' => $this->promptBuilder->promptVersion(),
                'status' => AiGenerationLog::STATUS_QUEUED,
                'candidates_count' => 0,
            ]);

            GenerateCardCandidatesJob::dispatch($child->id, [
                'domain_template_id' => $domainTemplateId,
                // chunk 単位では「既存候補との重複回避 (additional)」と「pending 全 reject (regenerate)」は
                // 最初の chunk でのみ適用する。2 つ目以降の chunk で同じ操作をすると先 chunk の結果を消してしまう。
                'regenerate' => $regenerate && $i === 0,
                'additional' => $additional,
                'chunk_text' => $chunkText,
                'chunk_index' => $i,
                'chunks_total' => $chunksTotal,
            ]);
        }

        return $parent->refresh();
    }

    /**
     * Job から呼ばれる本処理。queued log を受け取り、AI 呼び出し → 候補保存 → log 完了マークまで行う。
     *
     * 子ログ (parent_log_id IS NOT NULL) を処理した場合、最後に親ログの集約を更新する。
     *
     * @param  array{domain_template_id?: int|null, regenerate?: bool, additional?: bool, chunk_text?: string, chunk_index?: int, chunks_total?: int}  $options
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
            $this->updateParentAggregateIfChild($log);

            return [];
        }

        $template = $this->resolveTemplate($note, $options);
        $regenerate = (bool) ($options['regenerate'] ?? false);
        $additional = (bool) ($options['additional'] ?? false);
        $chunkText = $options['chunk_text'] ?? null;
        $chunkIndex = $options['chunk_index'] ?? null;
        $chunksTotal = $options['chunks_total'] ?? null;

        $decks = $this->deckRepository->idsAndNamesForUser($note->user_id);
        $existingQuestions = $additional
            ? $this->candidateRepository
                ->listForNoteSeed($note->user_id, $note->id, null)
                ->pluck('question')
                ->all()
            : [];

        $userPromptOptions = [
            'existing_questions' => $existingQuestions,
            'additional' => $additional,
        ];
        if ($chunkText !== null) {
            $userPromptOptions['body_override'] = $chunkText;
        }
        if ($chunkIndex !== null && $chunksTotal !== null) {
            $userPromptOptions['chunk_index'] = (int) $chunkIndex;
            $userPromptOptions['chunks_total'] = (int) $chunksTotal;
        }

        $request = new AiGenerationRequest(
            systemPrompt: $this->promptBuilder->systemPrompt($template, $decks),
            userPrompt: $this->promptBuilder->userPrompt($note, $userPromptOptions),
            model: (string) config('ai.default_model', 'gpt-4o-mini'),
            temperature: (float) config('ai.generation.temperature', 0.6),
            maxOutputTokens: (int) config('ai.generation.max_output_tokens', 16000),
        );

        try {
            $result = $this->callWithRetry($request);
        } catch (AiGenerationFailedException $e) {
            $this->markFailed($log, '['.($e->errorCode() ?? 'CALL_FAILED').']', $e->debugDetail() ?? $e->getMessage());
            $this->updateParentAggregateIfChild($log);

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
            $this->updateParentAggregateIfChild($log);

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
            $this->updateParentAggregateIfChild($log);

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
        $this->updateParentAggregateIfChild($log);

        return $candidates;
    }

    /**
     * 子ログの状態変化を親ログに反映する。子ログでない場合は何もしない。
     *
     * 集約ルール:
     *   - 全子が success → parent = success
     *   - 一部 success / 一部 failed → parent = partial_success
     *   - 全子が failed → parent = failed
     *   - 未完了 (queued/processing) の子がある → parent はそのまま processing
     *
     * candidates_count / トークン / コスト / duration は全子の合計を反映する。
     *
     * 並列実行する子 Job が同時に親を書き換える race を避けるため、
     * 親行を行ロック (lockForUpdate) してから読み直して集約する。
     */
    private function updateParentAggregateIfChild(AiGenerationLog $childLog): void
    {
        $parentId = $childLog->parent_log_id;
        if ($parentId === null) {
            return;
        }

        DB::transaction(function () use ($parentId): void {
            /** @var AiGenerationLog|null $parent */
            $parent = AiGenerationLog::query()
                ->whereKey($parentId)
                ->lockForUpdate()
                ->first();
            if ($parent === null) {
                return;
            }

            /** @var EloquentCollection<int, AiGenerationLog> $children */
            $children = AiGenerationLog::query()
                ->where('parent_log_id', $parentId)
                ->get();

            $successCount = $children->where('status', AiGenerationLog::STATUS_SUCCESS)->count();
            $failedCount = $children->where('status', AiGenerationLog::STATUS_FAILED)->count();
            $totalChunks = (int) ($parent->chunks_total ?? $children->count());
            $completedCount = $successCount + $failedCount;

            $totalCandidates = (int) $children->sum('candidates_count');
            $totalInputTokens = (int) $children->sum('input_tokens');
            $totalOutputTokens = (int) $children->sum('output_tokens');
            $totalCost = (float) $children->sum(fn (AiGenerationLog $c) => (float) $c->cost_usd);
            $maxDuration = (int) $children->max('duration_ms');

            $aggregate = [
                'candidates_count' => $totalCandidates,
                'input_tokens' => $totalInputTokens,
                'output_tokens' => $totalOutputTokens,
                'cost_usd' => $totalCost,
                'duration_ms' => $maxDuration,
            ];

            if ($completedCount < $totalChunks) {
                // まだ未完了の chunk がある → processing 中
                $aggregate['status'] = AiGenerationLog::STATUS_PROCESSING;
                $parent->update($aggregate);

                return;
            }

            // 全 chunk 完了 → 集約ステータスを決定
            if ($failedCount === 0) {
                $aggregate['status'] = AiGenerationLog::STATUS_SUCCESS;
                $aggregate['error_reason'] = null;
            } elseif ($successCount === 0) {
                $aggregate['status'] = AiGenerationLog::STATUS_FAILED;
                $aggregate['error_reason'] = $this->summarizeChildErrors($children);
            } else {
                $aggregate['status'] = AiGenerationLog::STATUS_PARTIAL_SUCCESS;
                $aggregate['error_reason'] = sprintf(
                    '[PARTIAL_SUCCESS] %d/%d chunks failed. %s',
                    $failedCount,
                    $totalChunks,
                    $this->summarizeChildErrors($children),
                );
            }

            // provider/model は子の中で実際に使われたものを採用 (pending のまま終わらせない)
            $firstCompleted = $children->firstWhere(
                fn (AiGenerationLog $c) => $c->provider !== 'pending' && $c->provider !== null,
            );
            if ($firstCompleted !== null) {
                $aggregate['provider'] = $firstCompleted->provider;
                $aggregate['model_name'] = $firstCompleted->model_name;
            }

            $parent->update($aggregate);
        });
    }

    /**
     * @param  EloquentCollection<int, AiGenerationLog>  $children
     */
    private function summarizeChildErrors(EloquentCollection $children): string
    {
        $messages = $children
            ->where('status', AiGenerationLog::STATUS_FAILED)
            ->pluck('error_reason')
            ->filter()
            ->take(3)
            ->all();

        return mb_substr(implode(' | ', $messages), 0, 1500);
    }

    private function markFailed(AiGenerationLog $log, string $code, string $detail): void
    {
        $this->logRepository->update($log, [
            'status' => AiGenerationLog::STATUS_FAILED,
            'error_reason' => mb_substr($code.' '.$detail, 0, 2000),
        ]);
    }

    private function assertMonthlyTokenLimit(int $userId): void
    {
        $limit = (int) config('ai.limits.monthly_token_limit', 0);
        if ($limit <= 0) {
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

    private function resolveTemplate(NoteSeed $note, array $options)
    {
        $templateId = $options['domain_template_id'] ?? $note->domain_template_id;
        if ($templateId === null) {
            return null;
        }

        return $this->templateRepository->findForUser($note->user_id, (int) $templateId);
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
