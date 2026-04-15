<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Review;

use App\Enums\ReviewRating;
use App\Enums\ScheduleState;
use App\Models\CardSchedule;
use App\Services\Review\Sm2Scheduler;
use PHPUnit\Framework\TestCase;

final class Sm2SchedulerTest extends TestCase
{
    private Sm2Scheduler $scheduler;

    private \DateTimeImmutable $now;

    protected function setUp(): void
    {
        parent::setUp();
        $this->scheduler = new Sm2Scheduler();
        $this->now = new \DateTimeImmutable('2026-04-15 12:00:00');
    }

    private function buildSchedule(
        string $state = 'new',
        int $interval = 0,
        float $ease = 2.5,
        int $reps = 0,
        int $lapses = 0,
    ): CardSchedule {
        $schedule = new CardSchedule();
        $schedule->state = ScheduleState::from($state);
        $schedule->interval_days = $interval;
        $schedule->ease_factor = $ease;
        $schedule->repetitions = $reps;
        $schedule->lapse_count = $lapses;

        return $schedule;
    }

    // ========================================
    // new 状態
    // ========================================

    public function test_new_again_は10分後(): void
    {
        $u = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Again, $this->now);
        $this->assertSame('learning', $u->state);
        $this->assertSame(0, $u->intervalDays);
        $this->assertSame(0, $u->repetitions);
        $this->assertSame(
            $this->now->modify('+10 minutes')->getTimestamp(),
            $u->dueAt->getTimestamp(),
        );
    }

    public function test_new_hard_は30分後(): void
    {
        $u = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Hard, $this->now);
        $this->assertSame('learning', $u->state);
        $this->assertSame(
            $this->now->modify('+30 minutes')->getTimestamp(),
            $u->dueAt->getTimestamp(),
        );
    }

    public function test_new_good_で_review_に昇格_1日後(): void
    {
        $u = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Good, $this->now);
        $this->assertSame('review', $u->state);
        $this->assertSame(1, $u->intervalDays);
        $this->assertSame(1, $u->repetitions);
    }

    public function test_new_easy_で_review_に昇格_4日後_ease_up(): void
    {
        $u = $this->scheduler->next($this->buildSchedule('new'), ReviewRating::Easy, $this->now);
        $this->assertSame('review', $u->state);
        $this->assertSame(4, $u->intervalDays);
        $this->assertEqualsWithDelta(2.5, $u->easeFactor, 0.001); // 既に上限 2.5
    }

    // ========================================
    // review 状態
    // ========================================

    public function test_review_again_で_relearning_lapse_increment(): void
    {
        $u = $this->scheduler->next(
            $this->buildSchedule('review', interval: 10, ease: 2.5, reps: 3, lapses: 0),
            ReviewRating::Again,
            $this->now,
        );
        $this->assertSame('relearning', $u->state);
        $this->assertSame(1, $u->lapseCount);
        $this->assertEqualsWithDelta(2.3, $u->easeFactor, 0.001);
        $this->assertSame(0, $u->repetitions);
    }

    public function test_review_hard_はinterval_1_2倍_ease_down(): void
    {
        $u = $this->scheduler->next(
            $this->buildSchedule('review', interval: 10, ease: 2.5),
            ReviewRating::Hard,
            $this->now,
        );
        // ceil(10 * 1.2) = 12
        $this->assertSame(12, $u->intervalDays);
        $this->assertEqualsWithDelta(2.35, $u->easeFactor, 0.001);
    }

    public function test_review_good_はinterval_ease倍(): void
    {
        $u = $this->scheduler->next(
            $this->buildSchedule('review', interval: 10, ease: 2.5),
            ReviewRating::Good,
            $this->now,
        );
        // ceil(10 * 2.5) = 25
        $this->assertSame(25, $u->intervalDays);
        $this->assertEqualsWithDelta(2.5, $u->easeFactor, 0.001);
    }

    public function test_review_easy_はinterval_ease_x_1_3倍_ease_up(): void
    {
        $u = $this->scheduler->next(
            $this->buildSchedule('review', interval: 10, ease: 2.0),
            ReviewRating::Easy,
            $this->now,
        );
        // ceil(10 * 2.0 * 1.3) = 26
        $this->assertSame(26, $u->intervalDays);
        $this->assertEqualsWithDelta(2.15, $u->easeFactor, 0.001);
    }

    // ========================================
    // ease_factor クランプ
    // ========================================

    public function test_ease_factorは1_3が下限(): void
    {
        $u = $this->scheduler->next(
            $this->buildSchedule('review', interval: 10, ease: 1.3),
            ReviewRating::Again,
            $this->now,
        );
        $this->assertEqualsWithDelta(1.3, $u->easeFactor, 0.001);
    }

    public function test_ease_factorは2_5が上限(): void
    {
        $u = $this->scheduler->next(
            $this->buildSchedule('review', interval: 10, ease: 2.5),
            ReviewRating::Easy,
            $this->now,
        );
        $this->assertEqualsWithDelta(2.5, $u->easeFactor, 0.001);
    }

    // ========================================
    // interval 下限
    // ========================================

    public function test_review_hard_でも_interval_は必ず前回より大きくなる(): void
    {
        $u = $this->scheduler->next(
            $this->buildSchedule('review', interval: 1, ease: 2.5),
            ReviewRating::Hard,
            $this->now,
        );
        // 1 * 1.2 = 1.2 → ceil=2、前回+1=2、結果 max=2
        $this->assertGreaterThan(1, $u->intervalDays);
    }
}
