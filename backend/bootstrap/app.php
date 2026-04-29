<?php

use App\Exceptions\Domain\DomainException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // 本番/staging は Docker 内部ネットワーク (Traefik / nginx) のみ信頼。
        // dev (TRUSTED_PROXIES 未設定) は '*' を許容して開発体験を維持。
        $middleware->trustProxies(at: env('TRUSTED_PROXIES')
            ? array_map('trim', explode(',', (string) env('TRUSTED_PROXIES')))
            : '*');

        $middleware->statefulApi();
        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ドメイン例外を API JSON レスポンスに変換
        $exceptions->render(function (DomainException $e, Request $request) {
            if ($request->expectsJson()) {
                $payload = ['message' => $e->userMessage()];
                if ($e->errorCode() !== null) {
                    $payload['code'] = $e->errorCode();
                }

                return response()->json($payload, $e->statusCode());
            }

            return null;
        });
    })->create();
