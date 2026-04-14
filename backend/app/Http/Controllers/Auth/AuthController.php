<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

final class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        Auth::login($user);
        $this->regenerateSession($request);

        return response()->json(['data' => $user], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::attempt($credentials, true)) {
            return response()->json([
                'message' => '認証情報が正しくありません。',
            ], 401);
        }

        $this->regenerateSession($request);

        return response()->json(['data' => Auth::user()]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $this->invalidateSession($request);

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()]);
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
