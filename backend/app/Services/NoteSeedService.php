<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Contracts\Services\Sync\SyncTombstoneRecorderInterface;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Models\NoteSeed;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class NoteSeedService
{
    public function __construct(
        private readonly NoteSeedRepositoryInterface $noteSeedRepository,
        private readonly CardRepositoryInterface $cardRepository,
        private readonly SyncTombstoneRecorderInterface $tombstoneRecorder,
    ) {}

    /**
     * @throws NoteSeedNotFoundException
     */
    public function getForUser(int $userId, int $noteSeedId): NoteSeed
    {
        $noteSeed = $this->noteSeedRepository->findForUser($userId, $noteSeedId);
        if ($noteSeed === null) {
            throw NoteSeedNotFoundException::make($noteSeedId);
        }

        return $noteSeed;
    }

    /**
     * @param  array{domain_template_id?: int, q?: string, generation_status?: string}  $filters
     * @return LengthAwarePaginator<int, NoteSeed>
     */
    public function paginateForUser(
        int $userId,
        array $filters = [],
        int $perPage = 20,
    ): LengthAwarePaginator {
        return $this->noteSeedRepository->paginateForUser($userId, $filters, $perPage);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createForUser(int $userId, array $attributes): NoteSeed
    {
        return $this->noteSeedRepository->create($userId, $attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws NoteSeedNotFoundException
     */
    public function updateForUser(int $userId, int $noteSeedId, array $attributes): NoteSeed
    {
        $noteSeed = $this->getForUser($userId, $noteSeedId);

        return $this->noteSeedRepository->update($noteSeed, $attributes);
    }

    /**
     * メモを削除する。
     *
     * 未採用の AI 候補はメモに対する外部キー CASCADE で必ず消える。
     * 採用済みカードは既定では残る (source_note_seed_id が null 化) が、
     * $deleteCards=true の場合はこのメモを出所とするカードと
     * その学習履歴・スケジュールも併せて削除する。
     *
     * @return int 併せて削除したカード数 (メモのみ削除時は 0)
     *
     * @throws NoteSeedNotFoundException
     */
    public function deleteForUser(int $userId, int $noteSeedId, bool $deleteCards = false): int
    {
        $noteSeed = $this->getForUser($userId, $noteSeedId);

        return DB::transaction(function () use ($userId, $noteSeedId, $noteSeed, $deleteCards): int {
            // 削除前に client_id を収集して iOS 向けの削除墓標を残す
            // (CASCADE で消える候補・スケジュールは削除後には列挙できない)
            $this->tombstoneRecorder->recordForNoteSeedDeletion($noteSeed, includeCards: $deleteCards);

            $deletedCards = $deleteCards
                ? $this->cardRepository->deleteBySourceNoteSeedForUser($userId, $noteSeedId)
                : 0;

            $this->noteSeedRepository->delete($noteSeed);

            return $deletedCards;
        });
    }
}
