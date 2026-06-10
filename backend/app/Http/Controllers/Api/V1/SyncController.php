<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\SyncServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sync\SyncRequest;
use App\Http\Resources\SyncResource;
use Illuminate\Http\JsonResponse;

final class SyncController extends Controller
{
    public function __construct(
        private readonly SyncServiceInterface $syncService,
    ) {}

    /**
     * 差分同期。クライアントの変更を取り込み（push）、since 以降のサーバ変更を返す（pull）。
     *
     * req:  { since: <cursor|null>, changes: { decks: [...], ... } }
     * res:  { data: { cursor: <new>, changes: { decks: [...], ... } } }
     */
    public function store(SyncRequest $request): JsonResponse
    {
        $userId = $request->user()->id;

        // validated() はルールのあるキー(client_id/updated_at/deleted)しか返さず本文が落ちるため、
        // 構造検証は SyncRequest に任せ、ペイロード自体は input() で受ける。
        // 列は SyncService 側でエンティティごとにホワイトリスト化するため安全。
        /** @var array<string, mixed> $changes */
        $changes = $request->input('changes', []) ?? [];
        $this->syncService->applyChanges($userId, $changes);

        $since = $request->input('since');
        $result = $this->syncService->collectChanges($userId, is_string($since) ? $since : null);

        return SyncResource::make($result)
            ->response()
            ->setStatusCode(200);
    }
}
