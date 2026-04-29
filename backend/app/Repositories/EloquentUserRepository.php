<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Laravel\Sanctum\PersonalAccessToken;

final class EloquentUserRepository implements UserRepositoryInterface
{
    public function findByEmail(string $email): ?User
    {
        /** @var User|null */
        return User::query()->where('email', $email)->first();
    }

    /**
     * @return Collection<int, PersonalAccessToken>
     */
    public function listTokens(User $user): Collection
    {
        /** @var Collection<int, PersonalAccessToken> $tokens */
        $tokens = $user->tokens()
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'last_used_at', 'created_at']);

        return $tokens;
    }

    public function markOnboarded(User $user): User
    {
        $user->update(['onboarding_completed_at' => now()]);

        return $user->refresh();
    }
}
