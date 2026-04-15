<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\DomainTemplate;
use Illuminate\Http\Request;

/**
 * @mixin DomainTemplate
 */
final class DomainTemplateResource extends BaseJsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'instruction_json' => $this->instruction_json,
            ...$this->timestamps(),
        ];
    }
}
