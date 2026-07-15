<?php

declare(strict_types=1);

namespace App\Contracts\Services\Sync;

use App\Models\Card;
use App\Models\Deck;
use App\Models\NoteSeed;

/**
 * Web (API) 起点の削除を iOS 同期へ伝播させる墓標書き込み。
 * 各 Service の削除トランザクション内で、実削除の「前」に呼ぶこと。
 */
interface SyncTombstoneRecorderInterface
{
    /**
     * メモ削除の墓標。CASCADE で消える候補と、$includeCards=true の場合は
     * このメモ由来のカード + スケジュールも対象にする。
     */
    public function recordForNoteSeedDeletion(NoteSeed $noteSeed, bool $includeCards): void;

    /**
     * カード削除の墓標。CASCADE で消えるスケジュールも対象にする。
     */
    public function recordForCardDeletion(Card $card): void;

    /**
     * デッキ削除の墓標 (空デッキのみ削除可能なため子の列挙は不要)。
     */
    public function recordForDeckDeletion(Deck $deck): void;
}
