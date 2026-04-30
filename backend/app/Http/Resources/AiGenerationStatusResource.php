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
            ...$this->timestamps(),
        ];
    }
}
