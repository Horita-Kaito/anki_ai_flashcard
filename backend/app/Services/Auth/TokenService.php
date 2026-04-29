<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * ネイティブアプリ / 外部クライアント向け Personal Access Token の発行・管理。
 *
 * SPA の Cookie 認証 (AuthController) とは責務を完全に分離する。
 */
final class TokenService
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
    ) {}

    /**
     * 認証情報を検証して Token を発行する。失敗時は null を返す。
     *
     * @return array{user: User, plainTextToken: string}|null
     */
    public function issueForCredentials(string $email, string $plainPassword, string $deviceName): ?array
    {
        $user = $this->userRepository->findByEmail($email);
        if ($user === null || ! Hash::check($plainPassword, $user->password)) {
            return null;
        }

        $token = $user->createToken($deviceName);

        return [
            'user' => $user,
            'plainTextToken' => $token->plainTextToken,
        ];
    }

    /**
     * @return Collection<int, PersonalAccessToken>
     */
    public function listFor(User $user): Collection
    {
        return $this->userRepository->listTokens($user);
    }

    public function revoke(PersonalAccessToken $token): void
    {
        $token->delete();
    }
}
