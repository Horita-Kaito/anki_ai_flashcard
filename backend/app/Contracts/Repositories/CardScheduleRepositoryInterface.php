<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\Card;
use App\Models\CardSchedule;

interface CardScheduleRepositoryInterface
{
    /**
     * カード作成時の初期スケジュールを作る (state=new, due_at=now)
     */
    public function createInitial(Card $card): CardSchedule;

    public function findByCard(int $cardId): ?CardSchedule;
}
