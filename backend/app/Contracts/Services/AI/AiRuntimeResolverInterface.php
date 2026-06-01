<?php

declare(strict_types=1);

namespace App\Contracts\Services\AI;

use App\Services\AI\AiRuntime;

interface AiRuntimeResolverInterface
{
    public function resolveForUser(int $userId): AiRuntime;
}
