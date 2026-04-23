<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Contracts\Repositories\AiGenerationLogRepositoryInterface;
use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Contracts\Services\AI\AiProviderInterface;
use App\Enums\CandidateStatus;
use App\Exceptions\Domain\AiGenerationFailedException;
use App\Exceptions\Domain\AiUsageLimitExceededException;
use App\Models\AiCardCandidate;
use App\Models\AiGenerationLog;
use App\Models\Deck;
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
        private readonly PromptBuilder $promptBuilder,
        private readonly CandidateParser $parser,
    ) {}

    /**
     * @param  array{count?: int, preferred_card_types?: array<int, string>, domain_template_id?: int, regenerate?: bool}  $options
     * @return array<int, AiCardCandidate>
     *
     * @throws AiGenerationFailedException
     * @throws AiUsageLimitExceededException
     */
    public function generate(NoteSeed $note, array $options = []): array
    {
        $this->assertDailyLimit($note->user_id);

        $template = $this->resolveTemplate($note, $options);
        $count = $this->clampCount($options['count'] ?? null);
        $model = (string) config('ai.default_model', 'gpt-4o-mini');
        $promptVersion = $this->promptBuilder->promptVersion();
        $regenerate = (bool) ($options['regenerate'] ?? false);

        $decks = Deck::where('user_id', $note->user_id)
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get()
            ->map(fn (Deck $d) => ['id' => $d->id, 'name' => $d->name])
            ->toArray();

        $request = new AiGenerationRequest(
            systemPrompt: $this->promptBuilder->systemPrompt($template, $decks),
            userPrompt: $this->promptBuilder->userPrompt($note, [
                'count' => $count,
                'preferred_card_types' => $options['preferred_card_types'] ?? null,
            ]),
            model: $model,
            temperature: (float) config('ai.generation.temperature', 0.6),
            maxOutputTokens: (int) config('ai.generation.max_output_tokens', 2000),
        );

        /** @var AiGenerationResult $result */
        $result = $this->callWithRetry($request);

        // JSON パース (リトライ済みの最終応答を)
        $parsed = $this->parser->parse($result->rawContent);

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
            'status' => $parsed === [] ? 'failed' : 'success',
            'error_reason' => $parsed === [] ? 'JSON パースに失敗しました' : null,
            'candidates_count' => count($parsed),
        ]);

        if ($parsed === []) {
            throw AiGenerationFailedException::invalidResponse(
                'AI 応答の JSON パースに失敗しました'
            );
        }

        $deckIds = array_column($decks, 'id');

        $candidates = DB::transaction(function () use ($note, $result, $parsed, $log, $regenerate, $deckIds) {
            if ($regenerate) {
                $this->candidateRepository->rejectPendingForNoteSeed($note->id);
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
        $limit = (int) config('ai.limits.daily_generation_calls', 100);
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

    private function clampCount(mixed $raw): int
    {
        $default = (int) config('ai.generation.default_candidate_count', 3);
        $max = (int) config('ai.generation.max_candidate_count', 10);
        $value = (int) ($raw ?? $default);

        return max(1, min($max, $value));
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
