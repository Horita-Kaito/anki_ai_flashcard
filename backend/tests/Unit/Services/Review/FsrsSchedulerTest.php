<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Review;

use App\Enums\ReviewRating;
use App\Enums\ScheduleState;
use App\Models\CardSchedule;
use App\Services\Review\FsrsScheduler;
use App\Services\Review\ScheduleUpdate;
use PHPUnit\Framework\TestCase;

final class FsrsSchedulerTest extends TestCase
{
    private FsrsScheduler $scheduler;

    private \DateTimeImmutable $now;

    protected function setUp(): void
    {
        parent::setUp();
        $this->scheduler = new FsrsScheduler(desiredRetention: 0.9);
        $this->now = new \DateTimeImmutable('2026-04-15 12:00:00');
    }

    private function buildSchedule(
        string $state = 'new',
        ?float $stability = null,
        ?float $difficulty = null,
        int $reps = 0,
        int $lapses = 0,
        ?string $lastReviewedAt = null,
        float $ease = 2.5,
        int $interval = 0,
    ): CardSchedule {
        $schedule = new CardSchedule;
        $schedule->state = ScheduleState::from($state);
        $schedule->stability = $stability;
        $schedule->difficulty = $difficulty;
        $schedule->repetitions = $reps;
        $schedule->lapse_count = $lapses;
        $schedule->ease_factor = $ease;
        $schedule->interval_days = $interval;
        if ($lastReviewedAt !== null) {
            // datetime cast が DB connection を要求するため raw attribute で直接セット
            $schedule->setRawAttributes(array_merge(
                $schedule->getAttributes(),
                ['last_reviewed_at' => $lastReviewedAt],
            ));
        }

        return $schedule;
    }

    // ========================================
    // 初回レビュー (state=new、stability=null)
    // ========================================

    public function test_初回_again_で_stability_と_difficulty_が初期化される(): void
    {
        $u = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Again, $this->now);

        $this->assertSame('learning', $u->state);
        $this->assertSame(0, $u->intervalDays);
        $this->assertNotNull($u->stability);
        $this->assertGreaterThan(0.0, $u->stability);
        $this->assertNotNull($u->difficulty);
        $this->assertGreaterThanOrEqual(1.0, $u->difficulty);
        $this->assertLessThanOrEqual(10.0, $u->difficulty);
        // Again で 10 分後
        $this->assertSame(
            $this->now->modify('+10 minutes')->getTimestamp(),
            $u->dueAt->getTimestamp(),
        );
    }

    public function test_初回_good_で_review_状態になり_interval_が日単位で出る(): void
    {
        $u = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Good, $this->now);

        $this->assertSame('review', $u->state);
        $this->assertGreaterThanOrEqual(1, $u->intervalDays);
        $this->assertSame(1, $u->repetitions);
    }

    public function test_初回_easy_は_good_より長い_interval_を出す(): void
    {
        $easyUpdate = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Easy, $this->now);
        $goodUpdate = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Good, $this->now);

        $this->assertGreaterThan($goodUpdate->intervalDays, $easyUpdate->intervalDays);
    }

    public function test_初回_again_は_easy_より高い_difficulty_を出す(): void
    {
        $againUpdate = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Again, $this->now);
        $easyUpdate = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Easy, $this->now);

        $this->assertGreaterThan($easyUpdate->difficulty, $againUpdate->difficulty);
    }

    // ========================================
    // 2 回目以降のレビュー (review state)
    // ========================================

    public function test_review_good_で_stability_が増加する(): void
    {
        $current = $this->buildSchedule(
            state: 'review',
            stability: 5.0,
            difficulty: 5.0,
            reps: 1,
            lastReviewedAt: '2026-04-10 12:00:00',
        );

        $u = $this->scheduler->next($current, ReviewRating::Good, $this->now);

        $this->assertSame('review', $u->state);
        $this->assertGreaterThan(5.0, $u->stability);
        $this->assertSame(2, $u->repetitions);
    }

    public function test_review_easy_は_good_より大きく_stability_を増やす(): void
    {
        $base = fn () => $this->buildSchedule(
            state: 'review',
            stability: 5.0,
            difficulty: 5.0,
            reps: 1,
            lastReviewedAt: '2026-04-10 12:00:00',
        );

        $good = $this->scheduler->next($base(), ReviewRating::Good, $this->now);
        $easy = $this->scheduler->next($base(), ReviewRating::Easy, $this->now);

        $this->assertGreaterThan($good->stability, $easy->stability);
        $this->assertGreaterThan($good->intervalDays, $easy->intervalDays);
    }

    public function test_review_again_で_relearning_へ移行し_lapse_count_が増える(): void
    {
        $current = $this->buildSchedule(
            state: 'review',
            stability: 10.0,
            difficulty: 5.0,
            reps: 3,
            lapses: 0,
            lastReviewedAt: '2026-04-05 12:00:00',
        );

        $u = $this->scheduler->next($current, ReviewRating::Again, $this->now);

        $this->assertSame('relearning', $u->state);
        $this->assertSame(1, $u->lapseCount);
        $this->assertSame(0, $u->repetitions);
        $this->assertSame(0, $u->intervalDays);
        // 10 分後再出題
        $this->assertSame(
            $this->now->modify('+10 minutes')->getTimestamp(),
            $u->dueAt->getTimestamp(),
        );
    }

    public function test_review_again_で_stability_は完全リセットされない_履歴が反映される(): void
    {
        // 既に学習が進んでいるカード (stability=20) は、Again しても完全に 0 にはならない
        $current = $this->buildSchedule(
            state: 'review',
            stability: 20.0,
            difficulty: 5.0,
            reps: 5,
            lapses: 0,
            lastReviewedAt: '2026-03-15 12:00:00',
        );

        $u = $this->scheduler->next($current, ReviewRating::Again, $this->now);

        $this->assertGreaterThan(0.0, $u->stability);
        // 元の stability=20 よりは小さい
        $this->assertLessThan(20.0, $u->stability);
    }

    // ========================================
    // 不変量テスト
    // ========================================

    public function test_difficulty_は1から10の範囲に収まる(): void
    {
        // Again を連続で出して D を上に振る
        $current = $this->buildSchedule('new');
        for ($i = 0; $i < 20; $i++) {
            $u = $this->scheduler->next($current, ReviewRating::Again, $this->now);
            $current = $this->applyUpdate($current, $u);
        }
        $this->assertLessThanOrEqual(10.0, (float) $current->difficulty);
        $this->assertGreaterThanOrEqual(1.0, (float) $current->difficulty);

        // Easy を連続で出して D を下に振る
        $current = $this->buildSchedule('new');
        for ($i = 0; $i < 20; $i++) {
            $u = $this->scheduler->next($current, ReviewRating::Easy, $this->now);
            $current = $this->applyUpdate($current, $u);
        }
        $this->assertGreaterThanOrEqual(1.0, (float) $current->difficulty);
        $this->assertLessThanOrEqual(10.0, (float) $current->difficulty);
    }

    public function test_stability_は常に正の値(): void
    {
        $current = $this->buildSchedule('new');
        foreach ([
            ReviewRating::Again, ReviewRating::Hard, ReviewRating::Good,
            ReviewRating::Again, ReviewRating::Easy, ReviewRating::Again,
        ] as $rating) {
            $u = $this->scheduler->next($current, $rating, $this->now);
            $this->assertGreaterThan(0.0, $u->stability, "rating={$rating->value}");
            $current = $this->applyUpdate($current, $u);
        }
    }

    public function test_review_状態の_good_は_interval_を伸ばし続ける(): void
    {
        $current = $this->buildSchedule(
            state: 'review',
            stability: 1.0,
            difficulty: 5.0,
            reps: 1,
            lastReviewedAt: '2026-04-14 12:00:00',
        );

        $intervals = [];
        $now = $this->now;
        for ($i = 0; $i < 5; $i++) {
            $u = $this->scheduler->next($current, ReviewRating::Good, $now);
            $intervals[] = $u->intervalDays;
            $current = $this->applyUpdate($current, $u);
            // 次回 due 日まで進める
            $now = $u->dueAt instanceof \DateTimeImmutable
                ? $u->dueAt
                : new \DateTimeImmutable('@'.$u->dueAt->getTimestamp());
        }

        // 単調増加を確認 (最低でも 4 回中 3 回は増えている)
        $increases = 0;
        for ($i = 1; $i < count($intervals); $i++) {
            if ($intervals[$i] >= $intervals[$i - 1]) {
                $increases++;
            }
        }
        $this->assertGreaterThanOrEqual(3, $increases, '間隔が単調増加していない: '.implode(',', $intervals));
    }

    // ========================================
    // desired_retention の影響
    // ========================================

    public function test_高い_desired_retention_は短い_interval_を出す(): void
    {
        $current = $this->buildSchedule(
            state: 'review',
            stability: 10.0,
            difficulty: 5.0,
            reps: 1,
            lastReviewedAt: '2026-04-10 12:00:00',
        );

        $strict = (new FsrsScheduler(desiredRetention: 0.97))
            ->next($current, ReviewRating::Good, $this->now);
        $loose = (new FsrsScheduler(desiredRetention: 0.85))
            ->next($current, ReviewRating::Good, $this->now);

        $this->assertLessThan($loose->intervalDays, $strict->intervalDays);
    }

    private function applyUpdate(CardSchedule $current, ScheduleUpdate $u): CardSchedule
    {
        $current->state = ScheduleState::from($u->state);
        $current->stability = $u->stability;
        $current->difficulty = $u->difficulty;
        $current->repetitions = $u->repetitions;
        $current->lapse_count = $u->lapseCount;
        $current->interval_days = $u->intervalDays;
        $current->ease_factor = $u->easeFactor;
        $current->setRawAttributes(array_merge(
            $current->getAttributes(),
            ['last_reviewed_at' => $u->lastReviewedAt->format('Y-m-d H:i:s')],
        ));

        return $current;
    }
}
