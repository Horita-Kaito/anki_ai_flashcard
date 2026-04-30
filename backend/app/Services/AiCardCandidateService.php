<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Enums\CandidateStatus;
use App\Exceptions\Domain\AiCardCandidateNotAdoptableException;
use App\Exceptions\Domain\AiCardCandidateNotFoundException;
use App\Models\AiCardCandidate;
use App\Models\Card;
use Illuminate\Support\Facades\DB;

/**
 * AI 候補の採用/編集/却下を扱うサービス。
 * カード採用時は Card + CardSchedule 作成 + 候補の adopted 更新を
 * 1 トランザクションで実施。
 */
final class AiCardCandidateService
{
    public function __construct(
        private readonly AiCardCandidateRepositoryInterface $candidateRepository,
        private readonly CardRepositoryInterface $cardRepository,
        private readonly CardScheduleRepositoryInterface $scheduleRepository,
    ) {}

    /**
     * @throws AiCardCandidateNotFoundException
     */
    public function getForUser(int $userId, int $candidateId): AiCardCandidate
    {
        $candidate = $this->candidateRepository->findForUser($userId, $candidateId);
        if ($candidate === null) {
            throw AiCardCandidateNotFoundException::make($candidateId);
        }

        return $candidate;
    }

    /**
     * 候補を編集する (採用前の修正)。
     *
     * @param  array<string, mixed>  $attributes
     *
     * @throws AiCardCandidateNotFoundException
     */
    public function updateForUser(int $userId, int $candidateId, array $attributes): AiCardCandidate
    {
        $candidate = $this->getForUser($userId, $candidateId);

        return $this->candidateRepository->update($candidate, $attributes);
    }

    /**
     * 候補を却下する (status=rejected)。
     *
     * @throws AiCardCandidateNotFoundException
     */
    public function rejectForUser(int $userId, int $candidateId): AiCardCandidate
    {
        $candidate = $this->getForUser($userId, $candidateId);

        return $this->candidateRepository->update($candidate, [
            'status' => CandidateStatus::Rejected->value,
        ]);
    }

    /**
     * 候補の却下を取り消す (rejected → pending)。Undo 用。
     *
     * @throws AiCardCandidateNotFoundException
     */
    public function restoreForUser(int $userId, int $candidateId): AiCardCandidate
    {
        $candidate = $this->getForUser($userId, $candidateId);

        return $this->candidateRepository->update($candidate, [
            'status' => CandidateStatus::Pending->value,
        ]);
    }

    /**
     * 候補をカードとして採用する。
     *
     * @param  array{deck_id: int, question?: string, answer?: string, explanation?: ?string, tag_ids?: array<int, int>}  $overrides
     *
     * @throws AiCardCandidateNotAdoptableException
     * @throws AiCardCandidateNotFoundException
     */
    public function adoptForUser(int $userId, int $candidateId, array $overrides): Card
    {
        return DB::transaction(function () use ($userId, $candidateId, $overrides) {
            // ロック取得して二重採用を防ぐ
            $candidate = $this->candidateRepository->findForUserForUpdate($userId, $candidateId);
            if ($candidate === null) {
                throw AiCardCandidateNotFoundException::make($candidateId);
            }
            if ($candidate->status !== CandidateStatus::Pending) {
                throw AiCardCandidateNotAdoptableException::alreadyProcessed(
                    $candidateId,
                    $candidate->status->value,
                );
            }

            $card = $this->cardRepository->create($userId, [
                'deck_id' => $overrides['deck_id'],
                'question' => $overrides['question'] ?? $candidate->question,
                'answer' => $overrides['answer'] ?? $candidate->answer,
                'explanation' => array_key_exists('explanation', $overrides)
                    ? $overrides['explanation']
                    : $candidate->explanation,
                'card_type' => $candidate->card_type?->value ?? 'basic_qa',
                'source_note_seed_id' => $candidate->note_seed_id,
                'source_ai_candidate_id' => $candidate->id,
                // 採用時に scheduler 指定が無ければ FSRS をデフォルトに
                'scheduler' => $overrides['scheduler'] ?? Card::SCHEDULER_FSRS,
            ]);

            $this->scheduleRepository->createInitial($card);

            $tagIds = $overrides['tag_ids'] ?? [];
            if ($tagIds !== []) {
                $this->cardRepository->syncTags($card, $tagIds);
            }

            $this->candidateRepository->update($candidate, [
                'status' => CandidateStatus::Adopted->value,
            ]);

            return $card->refresh()->load(['schedule', 'tags']);
        });
    }

    /**
     * @param  array<int, int>  $candidateIds
     * @return array<int, int>
     */
    private function uniqueIds(array $candidateIds): array
    {
        return array_values(array_unique($candidateIds));
    }

    /**
     * 複数候補を一括採用する。
     *
     * @param  array<int, int>  $candidateIds
     * @param  array<int, int>  $tagIds
     * @return array<int, Card>
     */
    public function batchAdoptForUser(
        int $userId,
        array $candidateIds,
        int $deckId,
        array $tagIds = [],
        ?string $scheduler = null,
    ): array {
        $cards = [];
        foreach ($this->uniqueIds($candidateIds) as $id) {
            try {
                $cards[] = $this->adoptForUser($userId, $id, [
                    'deck_id' => $deckId,
                    'tag_ids' => $tagIds,
                    'scheduler' => $scheduler ?? Card::SCHEDULER_FSRS,
                ]);
            } catch (AiCardCandidateNotAdoptableException|AiCardCandidateNotFoundException) {
                continue;
            }
        }

        return $cards;
    }
}
