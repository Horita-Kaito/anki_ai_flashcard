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
        $this->scheduler = new Sm2Scheduler;
        $this->now = new \DateTimeImmutable('2026-04-15 12:00:00');
    }

    private function buildSchedule(
        string $state = 'new',
        int $interval = 0,
        float $ease = 2.5,
        int $reps = 0,
        int $lapses = 0,
        ?string $dueAt = null,
    ): CardSchedule {
        $schedule = new CardSchedule;
        $schedule->state = ScheduleState::from($state);
        $schedule->interval_days = $interval;
        $schedule->ease_factor = $ease;
        $schedule->repetitions = $reps;
        $schedule->lapse_count = $lapses;
        if ($dueAt !== null) {
            $schedule->setRawAttributes(array_merge($schedule->getAttributes(), ['due_at' => $dueAt]));
        }

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

    // ========================================
    // due 前復習ポリシー
    // ========================================

    public function test_due前_good_はinterval据え置き(): void
    {
        $schedule = $this->buildSchedule('review', interval: 10, ease: 2.5, reps: 3, dueAt: '2026-04-20 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $this->assertSame(10, $u->intervalDays);
        $this->assertEqualsWithDelta(2.5, $u->easeFactor, 0.001);
    }

    public function test_due前_easy_はinterval伸ばすがease据え置き(): void
    {
        $schedule = $this->buildSchedule('review', interval: 10, ease: 2.0, reps: 3, dueAt: '2026-04-20 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Easy, $this->now);
        $this->assertGreaterThan(10, $u->intervalDays);
        $this->assertEqualsWithDelta(2.0, $u->easeFactor, 0.001);
    }

    public function test_due前_again_はinterval反映(): void
    {
        $schedule = $this->buildSchedule('review', interval: 10, ease: 2.5, reps: 3, dueAt: '2026-04-20 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Again, $this->now);
        $this->assertSame(0, $u->intervalDays);
        $this->assertSame(ScheduleState::Relearning->value, $u->state);
    }

    public function test_due前_hard_はinterval反映(): void
    {
        $schedule = $this->buildSchedule('review', interval: 10, ease: 2.0, reps: 3, dueAt: '2026-04-20 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Hard, $this->now);
        $this->assertGreaterThan(10, $u->intervalDays);
        $this->assertEqualsWithDelta(1.85, $u->easeFactor, 0.001);
    }

    public function test_due後_good_は通常通りinterval伸びる(): void
    {
        $schedule = $this->buildSchedule('review', interval: 10, ease: 2.5, reps: 3, dueAt: '2026-04-10 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $this->assertGreaterThan(10, $u->intervalDays);
    }

    // ========================================
    // Overdue decay (回答時にのみ適用される純粋計算)
    // ========================================

    public function test_overdue2日_goodは減衰済みintervalから計算(): void
    {
        // interval 10、2日超過 → ×0.8 = 8 を前回値として Good (×2.5) → 20
        $schedule = $this->buildSchedule('review', interval: 10, ease: 2.5, reps: 3, dueAt: '2026-04-13 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $this->assertSame(20, $u->intervalDays);
    }

    public function test_overdue8日_は半減してから計算(): void
    {
        // interval 20、8日超過 → ×0.5 = 10 を前回値として Good (×2.0) → 20
        $schedule = $this->buildSchedule('review', interval: 20, ease: 2.0, reps: 5, dueAt: '2026-04-07 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $this->assertSame(20, $u->intervalDays);
    }

    public function test_overdue15日超_はinterval1から計算(): void
    {
        // interval 30、15日超過 → 1 にリセット。Good (×2.0) → max(1+1, 2) = 2
        $schedule = $this->buildSchedule('review', interval: 30, ease: 2.0, reps: 5, dueAt: '2026-03-31 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $this->assertSame(2, $u->intervalDays);
    }

    public function test_overdue1日以内_は減衰しない(): void
    {
        // 12時間超過 → 減衰なし。interval 10 × 2.5 = 25
        $schedule = $this->buildSchedule('review', interval: 10, ease: 2.5, reps: 3, dueAt: '2026-04-15 00:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $this->assertSame(25, $u->intervalDays);
    }

    public function test_decayは純粋計算でscheduleを変更しない(): void
    {
        // 旧実装の「読むたびに interval が減る」regression 防止:
        // next() を何度呼んでも入力の schedule 自体は不変で、結果も同一。
        $schedule = $this->buildSchedule('review', interval: 20, ease: 2.0, reps: 5, dueAt: '2026-04-07 12:00:00');
        $first = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $second = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);

        $this->assertSame(20, (int) $schedule->interval_days);
        $this->assertSame($first->intervalDays, $second->intervalDays);
    }

    public function test_learning状態はoverdueでも減衰対象外(): void
    {
        // learning は interval 0 のため decay の影響を受けない
        $schedule = $this->buildSchedule('learning', interval: 0, ease: 2.5, dueAt: '2026-03-01 12:00:00');
        $u = $this->scheduler->next($schedule, ReviewRating::Good, $this->now);
        $this->assertSame(1, $u->intervalDays);
    }
}
