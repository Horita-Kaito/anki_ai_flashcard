<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\AiCardCandidateRepositoryInterface;
use App\Enums\CandidateStatus;
use App\Models\AiCardCandidate;
use Illuminate\Database\Eloquent\Collection;

final class EloquentAiCardCandidateRepository implements AiCardCandidateRepositoryInterface
{
    public function findForUser(int $userId, int $candidateId): ?AiCardCandidate
    {
        return AiCardCandidate::query()
            ->where('user_id', $userId)
            ->where('id', $candidateId)
            ->first();
    }

    public function listForNoteSeed(int $userId, int $noteSeedId, ?string $status = null): Collection
    {
        return AiCardCandidate::query()
            ->where('user_id', $userId)
            ->where('note_seed_id', $noteSeedId)
            ->when($status !== null, fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->get();
    }

    public function create(int $userId, array $attributes): AiCardCandidate
    {
        return AiCardCandidate::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(AiCardCandidate $candidate, array $attributes): AiCardCandidate
    {
        $candidate->update($attributes);

        return $candidate->refresh();
    }

    public function delete(AiCardCandidate $candidate): void
    {
        $candidate->delete();
    }

    public function rejectPendingForNoteSeed(int $noteSeedId): void
    {
        AiCardCandidate::query()
            ->where('note_seed_id', $noteSeedId)
            ->where('status', CandidateStatus::Pending->value)
            ->update(['status' => CandidateStatus::Rejected->value]);
    }
}
