<?php

declare(strict_types=1);

namespace App\Services\Sync;

use App\Contracts\Repositories\SyncTombstoneRepositoryInterface;
use App\Contracts\Services\Sync\SyncTombstoneRecorderInterface;
use App\Models\AiCardCandidate;
use App\Models\Card;
use App\Models\CardSchedule;
use App\Models\Deck;
use App\Models\NoteSeed;
use Illuminate\Support\Carbon;

/**
 * Web (API) 起点の削除を iOS へ伝播させるための墓標書き込み。
 *
 * SyncService::applyRecord は iOS からの push 受信時にしか墓標を作らないため、
 * Web 側の削除はこのレコーダーを通して墓標を残す (v1 の既知の制限への対応)。
 *
 * - client_id が無い行は一度も同期に乗っていない (どの端末も知らない) ため墓標不要。
 * - DB の FK CASCADE で消える同期対象の子 (候補・スケジュール) も、削除前に
 *   client_id を収集して墓標を残す。CASCADE 自体は Eloquent イベントを発火
 *   しないため、ここで明示的に列挙する必要がある。
 * - SyncService と同様に同期ドメインの infra サービスとしてモデルへ直接
 *   クエリする (削除前スナップショットの収集が目的で、CRUD の迂回ではない)。
 */
final class SyncTombstoneRecorder implements SyncTombstoneRecorderInterface
{
    public function __construct(
        private readonly SyncTombstoneRepositoryInterface $tombstones,
    ) {}

    /**
     * メモ削除の墓標。CASCADE で消える候補と、$includeCards=true の場合は
     * このメモ由来のカード + スケジュールも対象にする。
     */
    public function recordForNoteSeedDeletion(NoteSeed $noteSeed, bool $includeCards): void
    {
        $userId = (int) $noteSeed->user_id;
        $now = Carbon::now();

        $this->upsert($userId, 'note_seeds', $noteSeed->client_id, $now);

        $candidateClientIds = AiCardCandidate::query()
            ->where('user_id', $userId)
            ->where('note_seed_id', $noteSeed->id)
            ->whereNotNull('client_id')
            ->pluck('client_id');
        foreach ($candidateClientIds as $clientId) {
            $this->upsert($userId, 'ai_card_candidates', (string) $clientId, $now);
        }

        if ($includeCards) {
            $cardIds = Card::query()
                ->where('user_id', $userId)
                ->where('source_note_seed_id', $noteSeed->id)
                ->pluck('id');
            if ($cardIds->isNotEmpty()) {
                $this->recordCardsAndSchedules($userId, $cardIds->all(), $now);
            }
        }
    }

    /**
     * カード削除の墓標。CASCADE で消えるスケジュールも対象にする。
     */
    public function recordForCardDeletion(Card $card): void
    {
        $this->recordCardsAndSchedules((int) $card->user_id, [(int) $card->id], Carbon::now());
    }

    /**
     * デッキ削除の墓標。アプリ層で空デッキのみ削除可能なため子は列挙しない。
     */
    public function recordForDeckDeletion(Deck $deck): void
    {
        $this->upsert((int) $deck->user_id, 'decks', $deck->client_id, Carbon::now());
    }

    /**
     * @param  array<int, int>  $cardIds
     */
    private function recordCardsAndSchedules(int $userId, array $cardIds, Carbon $now): void
    {
        $cardClientIds = Card::query()
            ->where('user_id', $userId)
            ->whereIn('id', $cardIds)
            ->whereNotNull('client_id')
            ->pluck('client_id');
        foreach ($cardClientIds as $clientId) {
            $this->upsert($userId, 'cards', (string) $clientId, $now);
        }

        $scheduleClientIds = CardSchedule::query()
            ->where('user_id', $userId)
            ->whereIn('card_id', $cardIds)
            ->whereNotNull('client_id')
            ->pluck('client_id');
        foreach ($scheduleClientIds as $clientId) {
            $this->upsert($userId, 'card_schedules', (string) $clientId, $now);
        }
    }

    private function upsert(int $userId, string $entity, ?string $clientId, Carbon $now): void
    {
        if (! is_string($clientId) || $clientId === '') {
            return;
        }

        $this->tombstones->upsert($userId, $entity, $clientId, $now);
    }
}
