<?php

declare(strict_types=1);

namespace App\Services\Review;

use App\Contracts\Repositories\UserSettingRepositoryInterface;
use App\Contracts\Services\Review\SchedulerInterface;
use App\Contracts\Services\Review\SchedulerResolverInterface;
use App\Models\Card;

/**
 * Card->scheduler から適切な SchedulerInterface を返す resolver。
 *
 * - 'sm2'  → Sm2Scheduler (singleton 注入)
 * - 'fsrs' → FsrsScheduler (ユーザーの desired_retention を反映して都度生成)
 *
 * 不明な値・null は SM-2 にフォールバック (後方互換)。
 */
final class SchedulerResolver implements SchedulerResolverInterface
{
    /**
     * 同一リクエスト内で同じユーザーの FsrsScheduler を再利用するための memo。
     * keys: user_id, values: FsrsScheduler。N+1 的な user_setting 読み込みを抑止する。
     *
     * @var array<int, FsrsScheduler>
     */
    private array $fsrsCache = [];

    public function __construct(
        private readonly Sm2Scheduler $sm2Scheduler,
        private readonly UserSettingRepositoryInterface $userSettingRepository,
    ) {}

    public function resolveForCard(Card $card): SchedulerInterface
    {
        $scheduler = (string) ($card->scheduler ?? Card::SCHEDULER_SM2);

        if ($scheduler === Card::SCHEDULER_FSRS) {
            $userId = (int) $card->user_id;

            return $this->fsrsCache[$userId] ??= new FsrsScheduler(
                desiredRetention: $this->loadDesiredRetention($userId),
            );
        }

        return $this->sm2Scheduler;
    }

    private function loadDesiredRetention(int $userId): float
    {
        $setting = $this->userSettingRepository->findForUser($userId);
        $retention = $setting?->desired_retention ?? 0.9;

        return max(0.7, min(0.97, (float) $retention));
    }
}
