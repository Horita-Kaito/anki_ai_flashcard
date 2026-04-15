<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class DomainTemplateNotFoundException extends ResourceNotFoundException
{
    protected function label(): string
    {
        return '分野テンプレート';
    }
}
