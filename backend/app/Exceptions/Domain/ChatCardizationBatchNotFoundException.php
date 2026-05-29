<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class ChatCardizationBatchNotFoundException extends ResourceNotFoundException
{
    protected function label(): string
    {
        return 'カード化履歴';
    }
}
