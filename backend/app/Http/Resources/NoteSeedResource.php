<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\NoteSeed;
use Illuminate\Http\Request;

/**
 * @mixin NoteSeed
 */
final class NoteSeedResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'domain_template_id' => $this->domain_template_id,
            'subdomain' => $this->subdomain,
            'learning_goal' => $this->learning_goal,
            'note_context' => $this->note_context,
            // 一覧用の生成ステータス。withCount で詰められた時のみ含める (show では未付与)。
            ...$this->countsArray(),
            ...$this->timestamps(),
        ];
    }

    /** @return array<string, int> */
    private function countsArray(): array
    {
        $counts = [];
        foreach ([
            'candidates_pending_count',
            'candidates_adopted_count',
            'generation_attempts_count',
        ] as $key) {
            $value = $this->resource->getAttribute($key);
            if ($value !== null) {
                $counts[$key] = (int) $value;
            }
        }

        return $counts;
    }
}
