<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Laravel\Sanctum\PersonalAccessToken;

final class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => '認証情報が正しくありません。',
            ], 401);
        }

        $this->regenerateSession($request);

        /** @var User $user */
        $user = Auth::user();

        return response()->json(['data' => $this->serializeUser($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Bearer Token 経由なら自分自身の Token を revoke (Cookie 経由は TransientToken なのでスキップ)
        $token = $request->user()?->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        Auth::guard('web')->logout();
        $this->invalidateSession($request);

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $this->serializeUser($user)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUser(User $user): array
    {
        return [
            ...$user->toArray(),
            'is_admin' => Gate::forUser($user)->allows('access-admin'),
        ];
    }

    /**
     * セッションがある場合のみ regenerate する。
     * Sanctum SPA 認証時 (stateful) のみ該当。
     */
    private function regenerateSession(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
    }

    private function invalidateSession(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }
}
