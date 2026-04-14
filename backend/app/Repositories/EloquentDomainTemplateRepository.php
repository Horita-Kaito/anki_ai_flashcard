<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\DomainTemplateRepositoryInterface;
use App\Models\DomainTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

final class EloquentDomainTemplateRepository implements DomainTemplateRepositoryInterface
{
    public function findForUser(int $userId, int $templateId): ?DomainTemplate
    {
        return DomainTemplate::query()
            ->where('user_id', $userId)
            ->where('id', $templateId)
            ->first();
    }

    public function listForUser(int $userId): Collection
    {
        return DomainTemplate::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->get();
    }

    public function paginateForUser(int $userId, int $perPage = 20): LengthAwarePaginator
    {
        return DomainTemplate::query()
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->paginate($perPage);
    }

    public function create(int $userId, array $attributes): DomainTemplate
    {
        return DomainTemplate::create([...$attributes, 'user_id' => $userId]);
    }

    public function update(DomainTemplate $template, array $attributes): DomainTemplate
    {
        $template->update($attributes);

        return $template->refresh();
    }

    public function delete(DomainTemplate $template): void
    {
        $template->delete();
    }
}
