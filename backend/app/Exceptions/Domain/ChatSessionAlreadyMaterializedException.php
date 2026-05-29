<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class ChatSessionAlreadyMaterializedException extends DomainException
{
    public static function make(int $chatSessionId): self
    {
        return new self("チャット(id={$chatSessionId})はすでにカード化処理中、またはカード化済みです。");
    }

    public function statusCode(): int
    {
        return 409;
    }

    public function userMessage(): string
    {
        return 'このチャットはすでにカード化処理中、またはカード化済みです。';
    }

    public function errorCode(): ?string
    {
        return 'CHAT_ALREADY_MATERIALIZED';
    }
}
