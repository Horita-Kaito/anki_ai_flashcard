<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Sanctum\PersonalAccessToken;

interface UserRepositoryInterface
{
    public function findByEmail(string $email): ?User;

    /**
     * @return Collection<int, PersonalAccessToken>
     */
    public function listTokens(User $user): Collection;

    public function markOnboarded(User $user): User;
}
