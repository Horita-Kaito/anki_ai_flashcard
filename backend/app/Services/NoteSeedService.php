<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\NoteSeedRepositoryInterface;
use App\Exceptions\Domain\NoteSeedNotFoundException;
use App\Models\NoteSeed;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class NoteSeedService
{
    public function __construct(
        private readonly NoteSeedRepositoryInterface $noteSeedRepository,
    ) {}

    /**
     * @throws NoteSeedNotFoundException
     */
    public function getForUser(int $userId, int $noteSeedId): NoteSeed
    {
        $noteSeed = $this->noteSeedRepository->findForUser($userId, $noteSeedId);
        if ($noteSeed === null) {
            throw NoteSeedNotFoundException::make($noteSeedId);
        }

        return $noteSeed;
    }

    /**
     * @param  array{domain_template_id?: int, q?: string}  $filters
     * @return LengthAwarePaginator<int, NoteSeed>
     */
    public function paginateForUser(
        int $userId,
        array $filters = [],
        int $perPage = 20,
    ): LengthAwarePaginator {
        return $this->noteSeedRepository->paginateForUser($userId, $filters, $perPage);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createForUser(int $userId, array $attributes): NoteSeed
    {
        return $this->noteSeedRepository->create($userId, $attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     *
     * @throws NoteSeedNotFoundException
     */
    public function updateForUser(int $userId, int $noteSeedId, array $attributes): NoteSeed
    {
        $noteSeed = $this->getForUser($userId, $noteSeedId);

        return $this->noteSeedRepository->update($noteSeed, $attributes);
    }

    /**
     * @throws NoteSeedNotFoundException
     */
    public function deleteForUser(int $userId, int $noteSeedId): void
    {
        $noteSeed = $this->getForUser($userId, $noteSeedId);
        $this->noteSeedRepository->delete($noteSeed);
    }
}
