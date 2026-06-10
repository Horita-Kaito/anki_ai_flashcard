<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Services\SyncService;

/**
 * 端末間オプトイン同期 (push + pull) のドメインサービス契約。
 *
 * @see SyncService 競合解決(LWW)・削除墓標・参照解決の詳細
 */
interface SyncServiceInterface
{
    /**
     * クライアントからの変更を適用する（push）。
     *
     * @param  array<string, mixed>  $changes
     */
    public function applyChanges(int $userId, array $changes): void;

    /**
     * since 以降のサーバ差分を集める（pull）。
     *
     * @return array{cursor: string, changes: array<string, array<int, array<string, mixed>>>}
     */
    public function collectChanges(int $userId, ?string $since): array;
}
