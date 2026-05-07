<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Contracts\Services\UserCreationServiceInterface;
use App\Models\User;
use Illuminate\Support\Str;

final class UserCreationService implements UserCreationServiceInterface
{
    private const RANDOM_PASSWORD_LENGTH = 16;

    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
    ) {}

    public function create(string $name, string $email, string $password): User
    {
        return $this->userRepository->create([
            'name' => $name,
            'email' => $email,
            'password' => $password,
        ]);
    }

    public function createWithRandomPassword(string $name, string $email): array
    {
        $password = Str::password(self::RANDOM_PASSWORD_LENGTH, symbols: false);

        $user = $this->create($name, $email, $password);

        return [
            'user' => $user,
            'password' => $password,
        ];
    }
}
