<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\CardReview;

interface CardReviewRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): CardReview;

    /**
     * 指定期間のユーザーのレビュー件数
     */
    public function countForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): int;

    /**
     * 指定期間の評価別レビュー件数
     *
     * @return array<string, int>  rating => count
     */
    public function countByRatingForUserInPeriod(
        int $userId,
        \DateTimeInterface $from,
        \DateTimeInterface $to,
    ): array;

    public function totalCountForUser(int $userId): int;

    /**
     * デッキ別レビュー件数
     *
     * @return array<int, array{deck_id: int, deck_name: string, review_count: int, again_count: int}>
     */
    public function statsByDeckForUser(
        int $userId,
        ?\DateTimeInterface $from = null,
        ?\DateTimeInterface $to = null,
    ): array;
}
