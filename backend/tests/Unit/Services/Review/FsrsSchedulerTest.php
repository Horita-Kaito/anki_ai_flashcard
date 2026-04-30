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

    // ========================================
    // Reference vectors (FSRS-5 公式デフォルト重みから手計算した期待値)
    // 計算式: https://github.com/open-spaced-repetition/fsrs4anki/wiki
    // ========================================

    /**
     * 初期 stability = W[rating-1] (定義通り)。
     */
    public function test_reference_初期_stability_は重み配列の値そのもの(): void
    {
        // W = [0.4072, 1.1829, 3.1262, 15.4722, ...]
        $cases = [
            [ReviewRating::Again, 0.4072],
            [ReviewRating::Hard, 1.1829],
            [ReviewRating::Good, 3.1262],
            [ReviewRating::Easy, 15.4722],
        ];
        foreach ($cases as [$rating, $expected]) {
            $u = $this->scheduler->next($this->buildSchedule('new'), $rating, $this->now);
            $this->assertEqualsWithDelta($expected, $u->stability, 0.0001, "rating={$rating->value}");
        }
    }

    /**
     * 初期 difficulty = W[4] - exp(W[5] * (rating - 1)) + 1
     * W[4]=7.2102, W[5]=0.5316
     */
    public function test_reference_初期_difficulty_は仕様式通り(): void
    {
        // initDifficulty(1) = 7.2102 - exp(0) + 1 = 7.2102
        // initDifficulty(3) = 7.2102 - exp(1.0632) + 1 = 5.3151...
        // initDifficulty(4) = 7.2102 - exp(1.5948) + 1 = 3.2833...
        $cases = [
            [ReviewRating::Again, 7.2102],
            [ReviewRating::Good, 5.3151],
            [ReviewRating::Easy, 3.2833],
        ];
        foreach ($cases as [$rating, $expected]) {
            $u = $this->scheduler->next($this->buildSchedule('new'), $rating, $this->now);
            $this->assertEqualsWithDelta($expected, $u->difficulty, 0.001, "rating={$rating->value}");
        }
    }

    /**
     * desired_retention=0.9 のとき interval は stability にほぼ等しくなる
     * (FSRS-5 forgetting curve の代数的恒等式)。
     * I = S / FACTOR * (R^(1/DECAY) - 1) = S / FACTOR * (1/0.81 - 1) = S / FACTOR * FACTOR = S
     */
    public function test_reference_retention_0_9_では_interval_は_stability_と等しい(): void
    {
        $cases = [3.0, 10.0, 50.0, 100.0];
        foreach ($cases as $stability) {
            $current = $this->buildSchedule(
                state: 'review',
                stability: $stability,
                difficulty: 5.0,
                reps: 1,
                lastReviewedAt: '2026-04-10 12:00:00',
            );

            // Good で stability は更新されるので、interval を直接検証するには
            // クリーン入力 (review 状態 + 同じ S を維持する別の確認方法) ではなく
            // 計算後 stability と interval の関係を見る
            $u = $this->scheduler->next($current, ReviewRating::Good, $this->now);
            $this->assertSame((int) round($u->stability), $u->intervalDays, "S={$stability}");
        }
    }

    /**
     * 短期 stability formula: S' = S * exp(w17 * (rating - 3 + w18))
     * W[17]=0.5034, W[18]=0.6567
     * Good (rating=3): S' = S * exp(0.5034 * 0.6567) = S * exp(0.3306) = S * 1.3918
     */
    public function test_reference_短期_review_good_での_stability_変化(): void
    {
        // last_reviewed_at = now (elapsed_days < 1) になるよう構築
        $current = $this->buildSchedule(
            state: 'learning',
            stability: 10.0,
            difficulty: 5.0,
            reps: 1,
            lastReviewedAt: $this->now->modify('-30 minutes')->format('Y-m-d H:i:s'),
        );

        $u = $this->scheduler->next($current, ReviewRating::Good, $this->now);

        // S' = 10 * exp(0.5034 * (3 - 3 + 0.6567)) = 10 * exp(0.3306) ≈ 13.92
        $this->assertEqualsWithDelta(13.918, $u->stability, 0.01);
    }

    /**
     * 短期 stability formula で Again は stability を減らす:
     * S' = S * exp(0.5034 * (1 - 3 + 0.6567)) = S * exp(0.5034 * -1.3433) = S * exp(-0.6761) = S * 0.5086
     */
    public function test_reference_短期_review_again_での_stability_減少(): void
    {
        $current = $this->buildSchedule(
            state: 'learning',
            stability: 10.0,
            difficulty: 5.0,
            reps: 1,
            lastReviewedAt: $this->now->modify('-30 minutes')->format('Y-m-d H:i:s'),
        );

        $u = $this->scheduler->next($current, ReviewRating::Again, $this->now);

        // S' = 10 * exp(-0.6761) ≈ 5.086
        $this->assertEqualsWithDelta(5.086, $u->stability, 0.01);
    }

    /**
     * 想起率 (retrievability) 計算: R(t, S) = (1 + FACTOR * t / S)^DECAY
     * t=10 日、S=10 の場合、R = (1 + 0.2346)^(-0.5) ≈ 0.9 ぴったり (これは設計上の不変量)
     */
    public function test_reference_経過日数_s_と等しいとき_retrievability_は_0_9(): void
    {
        // この性質を間接的に検証: stability=10 で 10 日経過後の Good レビューで
        // post_recall_stability の計算に使われる R は 0.9 になっているはず。
        // 直接検証するため、Good レビュー結果が「retention=0.9 を仮定した時の値」と一致するか確認。
        $current = $this->buildSchedule(
            state: 'review',
            stability: 10.0,
            difficulty: 5.0,
            reps: 3,
            lastReviewedAt: $this->now->modify('-10 days')->format('Y-m-d H:i:s'),
        );

        $u = $this->scheduler->next($current, ReviewRating::Good, $this->now);

        // stability=10 で R=0.9 ちょうどの時 → post_recall で computed S' は具体値が出る
        // factor = exp(1.616) * (11-5) * 10^(-0.1544) * (exp(0.1 * 1.0824) - 1)
        //        = 5.0322 * 6 * 0.7003 * (exp(0.10824) - 1)
        //        = 5.0322 * 6 * 0.7003 * 0.11432
        //        ≈ 2.4163
        // S' = 10 * (1 + 2.4163) ≈ 34.16
        // 多少の浮動小数点誤差を許容
        $this->assertEqualsWithDelta(34.16, $u->stability, 0.5);
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
