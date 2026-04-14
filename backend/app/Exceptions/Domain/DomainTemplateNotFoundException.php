<?php

declare(strict_types=1);

namespace App\Exceptions\Domain;

final class DomainTemplateNotFoundException extends ResourceNotFoundException
{
    public static function make(int $templateId): self
    {
        return new self("DomainTemplate {$templateId} not found");
    }

    public function userMessage(): string
    {
        return '分野テンプレートが見つかりません';
    }
}
