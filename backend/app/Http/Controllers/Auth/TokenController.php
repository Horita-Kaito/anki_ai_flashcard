<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Laravel\Sanctum\PersonalAccessToken;

final class TokenController extends Controller
{
    public function __construct(
        private readonly TokenService $tokenService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:255'],
            'scope' => ['sometimes', Rule::in(array_keys(TokenService::SCOPE_ABILITIES))],
        ]);

        $issued = $this->tokenService->issueForCredentials(
            email: $credentials['email'],
            plainPassword: $credentials['password'],
            deviceName: $credentials['device_name'],
            abilities: TokenService::SCOPE_ABILITIES[$credentials['scope'] ?? 'full'],
        );

        if ($issued === null) {
            return response()->json([
                'message' => '認証情報が正しくありません。',
            ], 401);
        }

        return response()->json([
            'data' => $issued['user'],
            'token' => $issued['plainTextToken'],
        ], 201);
    }

    /**
     * 認証済みユーザーがパスワード再入力なしで Token を発行する (設定画面用)。
     */
    public function issue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_name' => ['required', 'string', 'max:255'],
            'scope' => ['sometimes', Rule::in(array_keys(TokenService::SCOPE_ABILITIES))],
        ]);

        $token = $this->tokenService->issueForUser(
            user: $request->user(),
            deviceName: $validated['device_name'],
            abilities: TokenService::SCOPE_ABILITIES[$validated['scope'] ?? 'full'],
        );

        return response()->json([
            'data' => [
                'id' => $token->accessToken->id,
                'name' => $token->accessToken->name,
                'abilities' => $token->accessToken->abilities,
            ],
            'token' => $token->plainTextToken,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $tokens = $this->tokenService->listFor($request->user());

        return response()->json([
            'data' => $tokens->map(static fn (PersonalAccessToken $token): array => [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $this->tokenService->revoke($token);
        }

        return response()->json(null, 204);
    }

    /**
     * ID 指定で自分の Token を失効させる (設定画面用)。
     */
    public function destroyById(Request $request, int $tokenId): JsonResponse
    {
        $revoked = $this->tokenService->revokeById($request->user(), $tokenId);

        if (! $revoked) {
            return response()->json(['message' => 'トークンが見つかりません。'], 404);
        }

        return response()->json(null, 204);
    }
}
