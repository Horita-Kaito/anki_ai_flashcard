<?php

declare(strict_types=1);

namespace App\Contracts\Services\Review;

use App\Models\Card;

/**
 * カードごとに適切な SchedulerInterface 実装を返す resolver。
 *
 * Card->scheduler ('sm2' | 'fsrs') に応じてディスパッチする。
 * FSRS 実装は呼び出し時のユーザー設定 (desired_retention) を反映するため、
 * resolver で都度ファクトリ的に生成する余地を残す。
 */
interface SchedulerResolverInterface
{
    public function resolveForCard(Card $card): SchedulerInterface;
}
