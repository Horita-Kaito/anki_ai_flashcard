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
     * 指定ユーザーの全メモ横断の未レビュー(pending)候補総数。
     */
    public function countPendingForUser(int $userId): int;

    /** @return array<int, string> */
    public function listActiveQuestionsForNoteSeed(int $userId, int $noteSeedId): array;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): AiCardCandidate;

    /**
     * DB 一意制約により同じ active 問題文が既にある場合は null を返す。
     *
     * @param  array<string, mixed>  $attributes
     */
    public function createIfActiveQuestionUnique(int $userId, array $attributes): ?AiCardCandidate;

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
