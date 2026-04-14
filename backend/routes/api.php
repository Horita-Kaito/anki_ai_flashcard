<?php

use App\Http\Controllers\Api\V1\CardController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DeckController;
use App\Http\Controllers\Api\V1\DomainTemplateController;
use App\Http\Controllers\Api\V1\NoteSeedController;
use App\Http\Controllers\Api\V1\TagController;
use App\Http\Controllers\Api\V1\UserSettingController;
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

        Route::get('dashboard/summary', [DashboardController::class, 'summary']);

        Route::apiResource('decks', DeckController::class);
        Route::apiResource('domain-templates', DomainTemplateController::class);
        Route::apiResource('note-seeds', NoteSeedController::class);
        Route::apiResource('cards', CardController::class);

        Route::get('tags', [TagController::class, 'index']);
        Route::post('tags', [TagController::class, 'store']);
        Route::delete('tags/{id}', [TagController::class, 'destroy']);

        Route::get('settings', [UserSettingController::class, 'show']);
        Route::put('settings', [UserSettingController::class, 'update']);
    });
});

// ヘルスチェック
Route::get('/health', fn () => response()->json(['status' => 'ok']));
