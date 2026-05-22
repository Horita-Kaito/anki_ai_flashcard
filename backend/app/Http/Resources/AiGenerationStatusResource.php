<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AiGenerationLog;
use Illuminate\Http\Request;

/**
 * @mixin AiGenerationLog
 */
final class AiGenerationStatusResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $chunksTotal = $this->chunks_total !== null ? (int) $this->chunks_total : null;
        $chunksCompleted = null;
        $chunksFailed = null;

        // 親ログの場合のみ子ログから進捗を集計してフロントに返す
        if ($this->parent_log_id === null && $chunksTotal !== null) {
            $children = $this->children;
            $chunksCompleted = $children
                ->whereIn('status', [
                    AiGenerationLog::STATUS_SUCCESS,
                    AiGenerationLog::STATUS_FAILED,
                ])
                ->count();
            $chunksFailed = $children
                ->where('status', AiGenerationLog::STATUS_FAILED)
                ->count();
        }

        return [
            'id' => $this->id,
            'note_seed_id' => $this->note_seed_id,
            'status' => $this->status,
            'job_id' => $this->job_id,
            'provider' => $this->provider,
            'model_name' => $this->model_name,
            'candidates_count' => (int) $this->candidates_count,
            'duration_ms' => (int) $this->duration_ms,
            'error_reason' => $this->error_reason,
            'chunks_total' => $chunksTotal,
            'chunks_completed' => $chunksCompleted,
            'chunks_failed' => $chunksFailed,
            ...$this->timestamps(),
        ];
    }
}
