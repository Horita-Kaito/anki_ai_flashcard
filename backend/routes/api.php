<?php

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // === 認証系 (ゲスト可) ===
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:5,1');
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    // === 認証必須 ===
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        // 今後: deck, card, note-seed, ai-candidate, review-session...
    });
});

// ヘルスチェック
Route::get('/health', fn () => response()->json(['status' => 'ok']));
