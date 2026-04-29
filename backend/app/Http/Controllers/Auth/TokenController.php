<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auth\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        ]);

        $issued = $this->tokenService->issueForCredentials(
            email: $credentials['email'],
            plainPassword: $credentials['password'],
            deviceName: $credentials['device_name'],
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

    public function index(Request $request): JsonResponse
    {
        $tokens = $this->tokenService->listFor($request->user());

        return response()->json(['data' => $tokens]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $this->tokenService->revoke($token);
        }

        return response()->json(null, 204);
    }
}
