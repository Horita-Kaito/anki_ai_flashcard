<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\CardReviewRepositoryInterface;
use App\Models\CardReview;

final class EloquentCardReviewRepository implements CardReviewRepositoryInterface
{
    public function create(array $attributes): CardReview
    {
        return CardReview::create($attributes);
    }

    public function countForUserInPeriod(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): int
    {
        return CardReview::query()
            ->where('user_id', $userId)
            ->whereBetween('reviewed_at', [$from, $to])
            ->count();
    }

    public function countByRatingForUserInPeriod(
        int $userId,
        \DateTimeInterface $from,
        \DateTimeInterface $to,
    ): array {
        $rows = CardReview::query()
            ->where('user_id', $userId)
            ->whereBetween('reviewed_at', [$from, $to])
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->get();

        /** @var array<string, int> $result */
        $result = [];
        foreach ($rows as $row) {
            $result[(string) $row->rating->value] = (int) $row->count;
        }

        return $result;
    }

    public function totalCountForUser(int $userId): int
    {
        return CardReview::query()->where('user_id', $userId)->count();
    }
}
