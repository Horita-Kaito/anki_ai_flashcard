<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 同期(pull)結果のレスポンス整形。
 *
 * resource には SyncService::collectChanges() の戻り値
 * (array{cursor: string, changes: array<string, array<int, array<string, mixed>>>}) を渡す。
 */
final class SyncResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var array{cursor: string, changes: array<string, mixed>} $result */
        $result = $this->resource;

        return [
            'cursor' => $result['cursor'],
            'changes' => $result['changes'],
        ];
    }
}
