<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * /mcp へのアクセスに mcp:use を要求する。
 *
 * tokenCan は認証経路によらず統一的に判定できる:
 * - Sanctum PAT ['*']        -> ワイルドカードで許可
 * - Sanctum PAT ['mcp:use']  -> 許可 (MCP 専用トークン)
 * - Passport OAuth トークン   -> scope mcp:use を要求 (コネクタは DCR で必ず付与)
 * - SPA セッション            -> TransientToken で常に許可
 */
final class EnsureMcpAbility
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->tokenCan('mcp:use')) {
            return response()->json([
                'message' => 'このトークンには MCP へのアクセス権限 (mcp:use) がありません。',
            ], 403);
        }

        return $next($request);
    }
}
