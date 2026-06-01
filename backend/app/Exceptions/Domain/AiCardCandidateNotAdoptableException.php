<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiCardCandidateNotAdoptableException extends DomainException
{
    public static function alreadyProcessed(int $candidateId, string $status): self
    {
        return new self(
            "候補(id={$candidateId})は既に処理済み(status={$status})のため採用できません。"
        );
    }

    public static function invalidTransition(int $candidateId, string $status, string $targetStatus): self
    {
        return new self(
            "候補(id={$candidateId})はstatus={$status}からstatus={$targetStatus}へ変更できません。"
        );
    }

    public function statusCode(): int
    {
        return 409;
    }
}
