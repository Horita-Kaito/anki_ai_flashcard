<?php

use App\Http\Controllers\Api\V1\AiCardCandidateController;
use App\Http\Controllers\Api\V1\CardController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DeckController;
use App\Http\Controllers\Api\V1\DomainTemplateController;
use App\Http\Controllers\Api\V1\NoteSeedController;
use App\Http\Controllers\Api\V1\OnboardingController;
use App\Http\Controllers\Api\V1\ReviewSessionController;
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

        Route::post('/onboarding', [OnboardingController::class, 'store']);
        Route::get('/onboarding/status', [OnboardingController::class, 'status']);

        Route::get('dashboard/summary', [DashboardController::class, 'summary']);

        Route::post('decks/reorder', [DeckController::class, 'reorder']);
        Route::apiResource('decks', DeckController::class);
        Route::apiResource('domain-templates', DomainTemplateController::class);
        Route::apiResource('note-seeds', NoteSeedController::class);
        Route::apiResource('cards', CardController::class);
        Route::post('cards/{id}/archive', [CardController::class, 'archive']);
        Route::post('cards/{id}/unarchive', [CardController::class, 'unarchive']);

        Route::get('tags', [TagController::class, 'index']);
        Route::post('tags', [TagController::class, 'store']);
        Route::delete('tags/{id}', [TagController::class, 'destroy']);

        Route::get('settings', [UserSettingController::class, 'show']);
        Route::put('settings', [UserSettingController::class, 'update']);

        // AI 候補 (生成系は rate limit を強めに)
        Route::middleware('throttle:ai-generation')->group(function () {
            Route::post('note-seeds/{id}/generate-candidates', [
                AiCardCandidateController::class, 'generate',
            ]);
            Route::post('note-seeds/{id}/regenerate-candidates', [
                AiCardCandidateController::class, 'regenerate',
            ]);
        });

        Route::get('note-seeds/{id}/candidates', [
            AiCardCandidateController::class, 'indexForNoteSeed',
        ]);
        Route::put('ai-card-candidates/{id}', [AiCardCandidateController::class, 'update']);
        Route::post('ai-card-candidates/{id}/reject', [AiCardCandidateController::class, 'reject']);
        Route::post('ai-card-candidates/{id}/restore', [AiCardCandidateController::class, 'restore']);
        Route::post('ai-card-candidates/{id}/adopt', [AiCardCandidateController::class, 'adopt']);
        Route::post('ai-card-candidates/batch-adopt', [AiCardCandidateController::class, 'batchAdopt']);

        // 復習セッション
        Route::get('review-sessions/today', [ReviewSessionController::class, 'today']);
        Route::get('review-sessions/extra', [ReviewSessionController::class, 'extra']);
        Route::post('review-sessions/answer', [ReviewSessionController::class, 'answer']);
        Route::get('review-stats', [ReviewSessionController::class, 'stats']);
    });
});

// ヘルスチェック
Route::get('/health', fn () => response()->json(['status' => 'ok']));
