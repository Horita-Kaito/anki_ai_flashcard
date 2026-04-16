<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CardRepositoryInterface;
use App\Contracts\Repositories\CardScheduleRepositoryInterface;
use App\Contracts\Repositories\TagRepositoryInterface;
use App\Exceptions\Domain\CardNotFoundException;
use App\Models\Card;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class CardService
{
    public function __construct(
        private readonly CardRepositoryInterface $cardRepository,
        private readonly CardScheduleRepositoryInterface $scheduleRepository,
        private readonly TagRepositoryInterface $tagRepository,
    ) {}

    /**
     * @throws CardNotFoundException
     */
    public function getForUser(int $userId, int $cardId): Card
    {
        $card = $this->cardRepository->findForUser($userId, $cardId);
        if ($card === null) {
            throw CardNotFoundException::make($cardId);
        }

        return $card;
    }

    /**
     * @param  array{deck_id?: int, tag_id?: int, q?: string}  $filters
     * @return LengthAwarePaginator<int, Card>
     */
    public function paginateForUser(
        int $userId,
        array $filters = [],
        int $perPage = 20,
    ): LengthAwarePaginator {
        return $this->cardRepository->paginateForUser($userId, $filters, $perPage);
    }

    /**
     * カード作成 + 初期スケジュール + タグ同期を 1 トランザクションで。
     *
     * @param  array<string, mixed>  $attributes  (tag_ids 可能)
     */
    public function createForUser(int $userId, array $attributes): Card
    {
        /** @var array<int, int> $tagIds */
        $tagIds = $attributes['tag_ids'] ?? [];
        unset($attributes['tag_ids']);

        $this->assertTagsOwnedByUser($userId, $tagIds);

        return DB::transaction(function () use ($userId, $attributes, $tagIds) {
            $card = $this->cardRepository->create($userId, $attributes);
            $this->scheduleRepository->createInitial($card);
            if ($tagIds !== []) {
                $this->cardRepository->syncTags($card, $tagIds);
            }

            return $card->refresh()->load(['schedule', 'tags']);
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws CardNotFoundException
     */
    public function updateForUser(int $userId, int $cardId, array $attributes): Card
    {
        $card = $this->getForUser($userId, $cardId);

        /** @var array<int, int>|null $tagIds */
        $tagIds = $attributes['tag_ids'] ?? null;
        unset($attributes['tag_ids']);

        if ($tagIds !== null) {
            $this->assertTagsOwnedByUser($userId, $tagIds);
        }

        return DB::transaction(function () use ($card, $attributes, $tagIds) {
            $updated = $this->cardRepository->update($card, $attributes);
            if ($tagIds !== null) {
                $this->cardRepository->syncTags($updated, $tagIds);
            }

            return $updated->refresh()->load(['schedule', 'tags']);
        });
    }

    /**
     * @throws CardNotFoundException
     */
    public function deleteForUser(int $userId, int $cardId): void
    {
        $card = $this->getForUser($userId, $cardId);
        $this->cardRepository->delete($card);
    }

    /**
     * カードをアーカイブする。
     *
     * @throws CardNotFoundException
     */
    public function archiveForUser(int $userId, int $cardId): Card
    {
        $card = $this->getForUser($userId, $cardId);
        $schedule = $this->scheduleRepository->findByCard($cardId);
        if ($schedule === null) {
            throw CardNotFoundException::make($cardId);
        }

        $this->scheduleRepository->archive($schedule);

        return $card->refresh()->load(['schedule', 'tags']);
    }

    /**
     * カードのアーカイブを解除する。interval を 1 にリセット。
     *
     * @throws CardNotFoundException
     */
    public function unarchiveForUser(int $userId, int $cardId): Card
    {
        $card = $this->getForUser($userId, $cardId);
        $schedule = $this->scheduleRepository->findByCard($cardId);
        if ($schedule === null) {
            throw CardNotFoundException::make($cardId);
        }

        $this->scheduleRepository->unarchive($schedule, 1);

        return $card->refresh()->load(['schedule', 'tags']);
    }

    /**
     * @param  array<int, int>  $tagIds
     */
    private function assertTagsOwnedByUser(int $userId, array $tagIds): void
    {
        if (! $this->tagRepository->allBelongToUser($userId, $tagIds)) {
            throw new InvalidArgumentException('指定されたタグに他ユーザーのものが含まれています');
        }
    }
}
