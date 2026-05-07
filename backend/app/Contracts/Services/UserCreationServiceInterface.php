<?php

declare(strict_types=1);

namespace App\Contracts\Services;

use App\Models\User;

interface UserCreationServiceInterface
{
    /**
     * 平文パスワードを指定してユーザーを作成する。
     */
    public function create(string $name, string $email, string $password): User;

    /**
     * ランダムパスワードを生成してユーザーを作成し、生成したパスワードを返す。
     *
     * 平文パスワードはレスポンスを介して呼び出し側に一度だけ提示する想定で、
     * DB には Hash::make 経由でハッシュ化した値だけが保存される。
     *
     * @return array{user: User, password: string}
     */
    public function createWithRandomPassword(string $name, string $email): array;
}
