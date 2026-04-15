<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Carbon\CarbonInterface;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * プロジェクト共通の JsonResource 基底。
 * ISO8601 日時変換などの定型処理を集約。
 */
abstract class BaseJsonResource extends JsonResource
{
    /**
     * Carbon/DateTime を ISO8601 文字列に変換。null は null のまま。
     */
    protected function toIso(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if ($value instanceof CarbonInterface) {
            return $value->toIso8601String();
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format(\DateTimeInterface::ATOM);
        }

        return null;
    }

    /**
     * 標準 `created_at` `updated_at` 配列を返す。
     * リソースの末尾で ...$this->timestamps() と展開する想定。
     *
     * @return array{created_at: ?string, updated_at: ?string}
     */
    protected function timestamps(): array
    {
        return [
            'created_at' => $this->toIso($this->created_at),
            'updated_at' => $this->toIso($this->updated_at),
        ];
    }
}
