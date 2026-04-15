<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiCardCandidateNotFoundException extends ResourceNotFoundException
{
    public static function make(int $candidateId): self
    {
        return new self("AiCardCandidate {$candidateId} not found");
    }

    public function userMessage(): string
    {
        return 'AI 候補が見つかりません';
    }
}
