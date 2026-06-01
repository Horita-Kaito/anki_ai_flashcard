<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Enums\CandidateStatus;
use App\Models\AiCardCandidate;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;

final class EloquentAiCardCandidateRepository extends AbstractUserScopedEloquentRepository implements AiCardCandidateRepositoryInterface
{
    protected function modelClass(): string
    {
        return AiCardCandidate::class;
    }

    public function findForUser(int $userId, int $candidateId): ?AiCardCandidate
    {
        /** @var AiCardCandidate|null */
        return $this->userScopedQuery($userId)->where('id', $candidateId)->first();
    }

    public function findForUserForUpdate(int $userId, int $candidateId): ?AiCardCandidate
    {
        /** @var AiCardCandidate|null */
        return $this->userScopedQuery($userId)
            ->where('id', $candidateId)
            ->lockForUpdate()
            ->first();
    }

    public function listForNoteSeed(int $userId, int $noteSeedId, ?string $status = null): Collection
    {
        /** @var Collection<int, AiCardCandidate> */
        return $this->userScopedQuery($userId)
            ->where('note_seed_id', $noteSeedId)
            ->when($status !== null, fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->get();
    }

    public function listActiveQuestionsForNoteSeed(int $userId, int $noteSeedId): array
    {
        return $this->userScopedQuery($userId)
            ->where('note_seed_id', $noteSeedId)
            ->whereIn('status', [
                CandidateStatus::Pending->value,
                CandidateStatus::Adopted->value,
            ])
            ->pluck('question')
            ->all();
    }

    public function create(int $userId, array $attributes): AiCardCandidate
    {
        /** @var AiCardCandidate */
        return $this->createOwnedBy($userId, $attributes);
    }

    public function createIfActiveQuestionUnique(int $userId, array $attributes): ?AiCardCandidate
    {
        try {
            return $this->create($userId, $attributes);
        } catch (QueryException $e) {
            if ($this->isQuestionFingerprintConflict($e)) {
                return null;
            }

            throw $e;
        }
    }

    public function update(AiCardCandidate $candidate, array $attributes): AiCardCandidate
    {
        /** @var AiCardCandidate */
        return $this->applyUpdate($candidate, $attributes);
    }

    public function delete(AiCardCandidate $candidate): void
    {
        $candidate->delete();
    }

    public function rejectPendingForNoteSeed(int $userId, int $noteSeedId): void
    {
        $this->userScopedQuery($userId)
            ->where('note_seed_id', $noteSeedId)
            ->where('status', CandidateStatus::Pending->value)
            ->update([
                'status' => CandidateStatus::Rejected->value,
                'question_fingerprint' => null,
            ]);
    }

    private function isQuestionFingerprintConflict(QueryException $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'idx_candidates_user_note_question_fingerprint')
            || (
                str_contains($message, 'ai_card_candidates.user_id')
                && str_contains($message, 'ai_card_candidates.note_seed_id')
                && str_contains($message, 'ai_card_candidates.question_fingerprint')
            );
    }
}
