<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Contracts\Repositories\UserRepositoryInterface;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * ネイティブアプリ / 外部クライアント向け Personal Access Token の発行・管理。
 *
 * SPA の Cookie 認証 (AuthController) とは責務を完全に分離する。
 *
 * abilities:
 * - ['*']        フルアクセス (REST API + MCP)。iOS アプリ等のデフォルト
 * - ['mcp:use']  MCP 専用。REST API グループの abilities:api-access で遮断される
 */
final class TokenService
{
    /** @var array<string, array<int, string>> scope 名 -> Sanctum abilities */
    public const SCOPE_ABILITIES = [
        'full' => ['*'],
        'mcp' => ['mcp:use'],
    ];

    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
    ) {}

    /**
     * 認証情報を検証して Token を発行する。失敗時は null を返す。
     *
     * @param  array<int, string>  $abilities
     * @return array{user: User, plainTextToken: string}|null
     */
    public function issueForCredentials(
        string $email,
        string $plainPassword,
        string $deviceName,
        array $abilities = ['*'],
    ): ?array {
        $user = $this->userRepository->findByEmail($email);
        if ($user === null || ! Hash::check($plainPassword, $user->password)) {
            return null;
        }

        $token = $user->createToken($deviceName, $abilities);

        return [
            'user' => $user,
            'plainTextToken' => $token->plainTextToken,
        ];
    }

    /**
     * 認証済みユーザーに対して Token を発行する (設定画面・CLI の再発行用)。
     *
     * @param  array<int, string>  $abilities
     */
    public function issueForUser(User $user, string $deviceName, array $abilities = ['*']): NewAccessToken
    {
        return $user->createToken($deviceName, $abilities);
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

    /**
     * 所有者を検証してから ID 指定で失効させる。所有していなければ false。
     */
    public function revokeById(User $user, int $tokenId): bool
    {
        /** @var PersonalAccessToken|null $token */
        $token = $user->tokens()->whereKey($tokenId)->first();

        if ($token === null) {
            return false;
        }

        $token->delete();

        return true;
    }
}
