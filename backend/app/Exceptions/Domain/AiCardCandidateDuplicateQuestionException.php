<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class AiCardCandidateDuplicateQuestionException extends DomainException
{
    public static function make(): self
    {
        return new self('同じ問題文の有効な候補が既に存在します。');
    }

    public function statusCode(): int
    {
        return 409;
    }
}
