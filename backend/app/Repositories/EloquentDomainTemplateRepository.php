<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Models\DomainTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

final class EloquentDomainTemplateRepository extends AbstractUserScopedEloquentRepository implements DomainTemplateRepositoryInterface
{
    protected function modelClass(): string
    {
        return DomainTemplate::class;
    }

    public function findForUser(int $userId, int $templateId): ?DomainTemplate
    {
        /** @var DomainTemplate|null */
        return $this->userScopedQuery($userId)->where('id', $templateId)->first();
    }

    public function listForUser(int $userId): Collection
    {
        /** @var Collection<int, DomainTemplate> */
        return $this->userScopedQuery($userId)
            ->orderByDesc('updated_at')
            ->get();
    }

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return $this->userScopedQuery($userId)
            ->orderByDesc('updated_at')
            ->paginate($perPage);
    }

    public function create(int $userId, array $attributes): DomainTemplate
    {
        /** @var DomainTemplate */
        return $this->createOwnedBy($userId, $attributes);
    }

    public function update(DomainTemplate $template, array $attributes): DomainTemplate
    {
        /** @var DomainTemplate */
        return $this->applyUpdate($template, $attributes);
    }

    public function delete(DomainTemplate $template): void
    {
        $template->delete();
    }
}
