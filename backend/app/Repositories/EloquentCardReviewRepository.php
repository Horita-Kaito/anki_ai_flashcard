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

    public function statsByDeckForUser(
        int $userId,
        ?\DateTimeInterface $from = null,
        ?\DateTimeInterface $to = null,
    ): array {
        $query = CardReview::query()
            ->join('cards', 'card_reviews.card_id', '=', 'cards.id')
            ->join('decks', 'cards.deck_id', '=', 'decks.id')
            ->where('card_reviews.user_id', $userId)
            ->selectRaw('
                decks.id as deck_id,
                decks.name as deck_name,
                COUNT(*) as review_count,
                SUM(CASE WHEN card_reviews.rating = ? THEN 1 ELSE 0 END) as again_count
            ', ['again'])
            ->groupBy('decks.id', 'decks.name')
            ->orderByDesc('review_count');

        if ($from !== null && $to !== null) {
            $query->whereBetween('card_reviews.reviewed_at', [$from, $to]);
        }

        return $query->get()->map(fn ($row) => [
            'deck_id' => (int) $row->deck_id,
            'deck_name' => (string) $row->deck_name,
            'review_count' => (int) $row->review_count,
            'again_count' => (int) $row->again_count,
        ])->all();
    }

    public function reviewedDatesForUser(int $userId, int $lookbackDays = 60): array
    {
        $from = now()->subDays($lookbackDays)->startOfDay();

        $rows = CardReview::query()
            ->where('user_id', $userId)
            ->where('reviewed_at', '>=', $from)
            ->selectRaw('DATE(reviewed_at) as day')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        return $rows->map(fn ($row) => (string) $row->day)->all();
    }
}
