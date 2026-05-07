<?php

declare(strict_types=1);

namespace App\Contracts\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Sanctum\PersonalAccessToken;

interface UserRepositoryInterface
{
    /**
     * @param  array{name: string, email: string, password: string}  $attributes
     */
    public function create(array $attributes): User;

    public function findByEmail(string $email): ?User;

    /**
     * @return Collection<int, PersonalAccessToken>
     */
    public function listTokens(User $user): Collection;

    public function markOnboarded(User $user): User;
}
