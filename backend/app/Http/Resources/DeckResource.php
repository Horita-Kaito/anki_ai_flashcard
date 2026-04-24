<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Deck;
use Illuminate\Http\Request;

/**
 * @mixin Deck
 */
final class DeckResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'description' => $this->description,
            'default_domain_template_id' => $this->default_domain_template_id,
            'display_order' => $this->display_order,
            'path' => $this->when(
                $this->relationLoaded('ancestors') || isset($this->path),
                fn () => $this->path ?? null,
            ),
            'has_children' => $this->when(
                isset($this->children_count),
                fn () => ((int) $this->children_count) > 0,
            ),
            ...$this->timestamps(),
        ];
    }
}
