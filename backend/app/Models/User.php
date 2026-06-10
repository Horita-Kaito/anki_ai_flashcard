<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'onboarding_completed_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /**
     * Sanctum の HasApiTokens のみを使う。Passport OAuth (MCP コネクタ用) の
     * TokenGuard がモデルに要求するのは withAccessToken() だけで、Sanctum 側の
     * 実装 (無型引数への代入) がそのまま互換する。tokenCan() も $accessToken->can()
     * 委譲のため、Passport の AccessToken (can() 実装済み) と Sanctum PAT の両方で
     * 同一に動く。Passport の HasApiTokens は $accessToken プロパティの型が
     * Sanctum と非互換なため併用できない。
     *
     * @use HasFactory<UserFactory>
     */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
