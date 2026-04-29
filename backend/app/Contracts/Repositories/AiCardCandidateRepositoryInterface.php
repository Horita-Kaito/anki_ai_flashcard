<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\AiCardCandidate;
use Illuminate\Database\Eloquent\Collection;

interface AiCardCandidateRepositoryInterface
{
    public function findForUser(int $userId, int $candidateId): ?AiCardCandidate;

    /**
     * 採用処理用に行ロックを取って取得する。トランザクション内でのみ使用すること。
     */
    public function findForUserForUpdate(int $userId, int $candidateId): ?AiCardCandidate;

    /** @return Collection<int, AiCardCandidate> */
    public function listForNoteSeed(int $userId, int $noteSeedId, ?string $status = null): Collection;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): AiCardCandidate;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(AiCardCandidate $candidate, array $attributes): AiCardCandidate;

    public function delete(AiCardCandidate $candidate): void;

    /**
     * 指定ユーザー・指定 note_seed_id の pending 候補を一括 rejected にする
     */
    public function rejectPendingForNoteSeed(int $userId, int $noteSeedId): void;
}
