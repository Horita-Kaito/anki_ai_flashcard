<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Contracts\Services\AI\CandidateQualityValidatorInterface;
use App\Enums\CandidateStatus;
use App\Enums\CardType;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Models\AiCardCandidate;
use App\Models\NoteSeed;
use Illuminate\Support\Facades\DB;

/**
 * 外部 LLM (MCP クライアント等) が起案したカードドラフトを AI 候補として登録する。
 *
 * サーバー側 AI 生成 (CardGenerationService) と異なり生成ログを持たないため、
 * provider='external' / ai_generation_log_id=null で保存する。
 * 候補は必ず pending で保存され、採用 (Card 化) は人間のレビューを経た
 * adopt フローのみが行う。このサービスは cards テーブルに一切書き込まない。
 */
final class ExternalCardProposalService
{
    public const PROVIDER = 'external';

    public function __construct(
        private readonly NoteSeedRepositoryInterface $noteSeedRepository,
        private readonly AiCardCandidateRepositoryInterface $candidateRepository,
        private readonly CandidateQualityValidatorInterface $qualityValidator,
    ) {}

    /**
     * @param  array<int, array{question: string, answer: string, card_type?: string, explanation?: string|null}>  $drafts
     * @return array{note_seed: NoteSeed, created: array<int, AiCardCandidate>, skipped_duplicates: int}
     *
     * @throws NoteSeedNotFoundException
     */
    public function proposeForUser(
        int $userId,
        ?int $noteSeedId,
        ?string $noteContent,
        array $drafts,
        string $modelName = 'unknown',
    ): array {
        return DB::transaction(function () use ($userId, $noteSeedId, $noteContent, $drafts, $modelName): array {
            $note = $this->resolveNoteSeed($userId, $noteSeedId, $noteContent);

            $normalized = array_map(static fn (array $draft): array => [
                'question' => $draft['question'],
                'answer' => $draft['answer'],
                'card_type' => $draft['card_type'] ?? CardType::BasicQa->value,
                'explanation' => $draft['explanation'] ?? null,
            ], $drafts);

            // バッチ内重複の除去と品質警告の付与 (サーバー側生成と同じ検証器)
            $validated = $this->qualityValidator->validate($normalized);
            $skipped = count($normalized) - count($validated);

            $created = [];
            foreach ($validated as $draft) {
                $candidate = $this->candidateRepository->createIfActiveQuestionUnique($userId, [
                    'note_seed_id' => $note->id,
                    'ai_generation_log_id' => null,
                    'provider' => self::PROVIDER,
                    'model_name' => $modelName,
                    'question' => $draft['question'],
                    'question_fingerprint' => $this->qualityValidator->fingerprint($draft['question']),
                    'answer' => $draft['answer'],
                    'card_type' => $draft['card_type'],
                    'explanation' => $draft['explanation'],
                    'status' => CandidateStatus::Pending->value,
                    'raw_response' => $draft,
                ]);

                if ($candidate === null) {
                    $skipped++;

                    continue;
                }

                $created[] = $candidate;
            }

            return [
                'note_seed' => $note,
                'created' => $created,
                'skipped_duplicates' => $skipped,
            ];
        });
    }

    /**
     * @throws NoteSeedNotFoundException
     */
    private function resolveNoteSeed(int $userId, ?int $noteSeedId, ?string $noteContent): NoteSeed
    {
        if ($noteSeedId !== null) {
            $note = $this->noteSeedRepository->findForUser($userId, $noteSeedId);

            if ($note === null) {
                throw NoteSeedNotFoundException::make($noteSeedId);
            }

            return $note;
        }

        return $this->noteSeedRepository->create($userId, [
            'body' => (string) $noteContent,
        ]);
    }
}
