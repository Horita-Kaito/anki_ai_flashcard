<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Contracts\Services\AI\AiProviderInterface;

final class AiRuntime
{
    public function __construct(
        public readonly AiProviderInterface $provider,
        public readonly string $model,
    ) {}
}
