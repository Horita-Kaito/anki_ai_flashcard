<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\DomainTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface DomainTemplateRepositoryInterface
{
    public function findForUser(int $userId, int $templateId): ?DomainTemplate;

    /** @return Collection<int, DomainTemplate> */
    public function listForUser(int $userId): Collection;

    /** @return LengthAwarePaginator<int, DomainTemplate> */
    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): DomainTemplate;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(DomainTemplate $template, array $attributes): DomainTemplate;

    public function delete(DomainTemplate $template): void;
}
