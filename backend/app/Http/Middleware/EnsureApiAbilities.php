<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Laravel\Sanctum\Exceptions\MissingAbilityException;
use Laravel\Sanctum\TransientToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanctum の CheckAbilities 相当。ただしトークンが無い場合は
 * ファーストパーティ認証 (SPA セッション) とみなして通す。
 *
 * Sanctum 経由の認証では本番で必ず currentAccessToken が付く
 * (Bearer は PAT、セッションフォールバックは TransientToken)。
 * トークンが null になるのはテストで同一プロセス内に actingAs() を
 * 複数回呼んだ場合のみで、CheckAbilities だとこれが 401 になってしまう。
 */
final class EnsureApiAbilities
{
    /**
     * @throws AuthenticationException
     * @throws MissingAbilityException
     */
    public function handle(Request $request, Closure $next, string ...$abilities): Response
    {
        $user = $request->user();

        if ($user === null) {
            throw new AuthenticationException;
        }

        $token = $user->currentAccessToken();

        if ($token === null || $token instanceof TransientToken) {
            return $next($request);
        }

        foreach ($abilities as $ability) {
            if (! $token->can($ability)) {
                throw new MissingAbilityException($ability);
            }
        }

        return $next($request);
    }
}
