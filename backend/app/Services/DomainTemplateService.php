<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Exceptions\Domain\DomainTemplateNotFoundException;
use App\Models\DomainTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

final class DomainTemplateService
{
    public function __construct(
        private readonly DomainTemplateRepositoryInterface $templateRepository,
    ) {}

    /**
     * @throws DomainTemplateNotFoundException
     */
    public function getForUser(int $userId, int $templateId): DomainTemplate
    {
        $template = $this->templateRepository->findForUser($userId, $templateId);
        if ($template === null) {
            throw DomainTemplateNotFoundException::make($templateId);
        }

        return $template;
    }

    /** @return Collection<int, DomainTemplate> */
    public function listForUser(int $userId): Collection
    {
        return $this->templateRepository->listForUser($userId);
    }

    /** @return LengthAwarePaginator<int, DomainTemplate> */
    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return $this->templateRepository->paginateForUser($userId, $perPage);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createForUser(int $userId, array $attributes): DomainTemplate
    {
        return $this->templateRepository->create($userId, $attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws DomainTemplateNotFoundException
     */
    public function updateForUser(int $userId, int $templateId, array $attributes): DomainTemplate
    {
        $template = $this->getForUser($userId, $templateId);

        return $this->templateRepository->update($template, $attributes);
    }

    /**
     * @throws DomainTemplateNotFoundException
     */
    public function deleteForUser(int $userId, int $templateId): void
    {
        $template = $this->getForUser($userId, $templateId);
        $this->templateRepository->delete($template);
    }
}
