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
            'name' => $this->name,
            'description' => $this->description,
            'default_domain_template_id' => $this->default_domain_template_id,
            'new_cards_limit' => $this->new_cards_limit,
            'review_limit' => $this->review_limit,
            ...$this->timestamps(),
        ];
    }
}
