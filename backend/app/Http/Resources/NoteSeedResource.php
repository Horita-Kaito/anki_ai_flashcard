<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\NoteSeed;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin NoteSeed
 */
final class NoteSeedResource extends JsonResource
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
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
