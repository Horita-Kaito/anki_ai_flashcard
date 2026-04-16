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

    /**
     * 指定時刻までに due_at が到達しているスケジュール件数 (= 今日の復習対象数)
     */
    public function dueCountForUser(int $userId, \DateTimeInterface $before): int;

    /**
     * state='new' のスケジュール件数
     */
    public function newCountForUser(int $userId): int;

    /**
     * 指定時刻までに due_at が到達しているスケジュール + カードを取得する (今日の復習対象)
     *
     * @return array<int, CardSchedule>
     */
    public function dueCardsForUser(int $userId, \DateTimeInterface $before, ?int $deckId, int $limit): array;

    /**
     * スケジュールを更新する (スケジューラの計算結果を反映)
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(CardSchedule $schedule, array $attributes): CardSchedule;

    /**
     * 期限切れカード (overdue) のスケジュールを取得する (decay 適用対象)
     *
     * @return array<int, CardSchedule>
     */
    public function overdueCardsForUser(int $userId, \DateTimeInterface $before): array;

    /**
     * カードをアーカイブする
     */
    public function archive(CardSchedule $schedule): CardSchedule;

    /**
     * カードのアーカイブを解除する
     */
    public function unarchive(CardSchedule $schedule, int $resetIntervalDays): CardSchedule;

    /**
     * カードIDでスケジュールを取得する (user_id スコープ付き)
     */
    public function findByCardForUser(int $userId, int $cardId): ?CardSchedule;
}
