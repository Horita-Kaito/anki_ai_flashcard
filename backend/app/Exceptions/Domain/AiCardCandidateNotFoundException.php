<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiCardCandidateNotFoundException extends ResourceNotFoundException
{
    protected function label(): string
    {
        return 'AI 候補';
    }
}
