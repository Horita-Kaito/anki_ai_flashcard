<?php

use App\Http\Controllers\Auth\WebLoginController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// OAuth 認可フロー (Passport の /oauth/authorize) 用の最小ログイン画面。
// ゲストが認可エンドポイントに来ると named route 'login' へリダイレクトされる。
// パスは /oauth 配下に置く: SPA (Next.js) 側にも /login ページがあり、
// staging/本番のリバースプロキシは /oauth 系のみバックエンドへ振るため。
Route::get('/oauth/login', [WebLoginController::class, 'show'])->name('login');
Route::post('/oauth/login', [WebLoginController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('login.store');
Route::post('/oauth/logout', [WebLoginController::class, 'destroy'])->name('logout');
