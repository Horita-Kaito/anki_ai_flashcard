<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * サーバー側での作成・編集を端末間同期の LWW (client_updated_at 比較) に参加させる。
 *
 * SyncService (クライアント push) は client_updated_at を明示的に設定するため dirty になり、
 * このフックはスキップされる。Web/MCP/CLI などサーバー側の編集は client_updated_at を
 * 触らないため、ここで論理時刻を進める。これが無いと、サーバー側の編集が
 * 古いクライアント push (LWW 比較で勝ってしまう) に上書きされる。
 */
trait BumpsClientUpdatedAt
{
    public static function bootBumpsClientUpdatedAt(): void
    {
        static::saving(static function (Model $model): void {
            if ($model->isDirty('client_updated_at')) {
                return;
            }
            if (! $model->exists || $model->isDirty()) {
                $model->setAttribute('client_updated_at', now());
            }
        });
    }
}
