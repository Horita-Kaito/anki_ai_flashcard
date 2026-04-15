<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\CardReviewRepositoryInterface;

/**
 * 連続学習日数 (ストリーク) を計算する純粋ロジック。
 * 過去 60 日のレビュー実施日リストから current/longest を算出。
 */
final class StreakService
{
    public function __construct(
        private readonly CardReviewRepositoryInterface $reviewRepository,
    ) {}

    /**
     * @return array{current: int, longest: int, today_done: bool}
     */
    public function summaryForUser(int $userId): array
    {
        $dates = $this->reviewRepository->reviewedDatesForUser($userId, 60);

        if ($dates === []) {
            return ['current' => 0, 'longest' => 0, 'today_done' => false];
        }

        // YYYY-MM-DD ソート済み配列
        $today = now()->format('Y-m-d');
        $yesterday = now()->subDay()->format('Y-m-d');
        $todayDone = in_array($today, $dates, true);

        // current streak: 末尾から逆順に連続日をカウント
        $current = 0;
        if ($todayDone || in_array($yesterday, $dates, true)) {
            // 今日 or 昨日 が含まれていれば streak が継続中とみなす
            $cursor = $todayDone ? $today : $yesterday;
            while (in_array($cursor, $dates, true)) {
                $current++;
                $cursor = (new \DateTimeImmutable($cursor))
                    ->modify('-1 day')
                    ->format('Y-m-d');
            }
        }

        // longest streak: 全体を走査して最長連続を計算
        $longest = $this->calculateLongestStreak($dates);

        return [
            'current' => $current,
            'longest' => max($longest, $current),
            'today_done' => $todayDone,
        ];
    }

    /**
     * @param  array<int, string>  $sortedDates  YYYY-MM-DD 昇順
     */
    private function calculateLongestStreak(array $sortedDates): int
    {
        if ($sortedDates === []) {
            return 0;
        }

        $longest = 1;
        $current = 1;
        for ($i = 1; $i < count($sortedDates); $i++) {
            $prev = new \DateTimeImmutable($sortedDates[$i - 1]);
            $curr = new \DateTimeImmutable($sortedDates[$i]);
            $diff = (int) $prev->diff($curr)->days;

            if ($diff === 1) {
                $current++;
                $longest = max($longest, $current);
            } else {
                $current = 1;
            }
        }

        return $longest;
    }
}
