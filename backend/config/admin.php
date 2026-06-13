<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Admin Emails
    |--------------------------------------------------------------------------
    |
    | カンマ区切りで管理者の email を ADMIN_EMAILS env に設定する。
    | ここに含まれる email を持つユーザーは access-admin Gate を通過し、
    | 管理用エンドポイント (/api/v1/admin/*) と管理画面にアクセスできる。
    |
    | env 未設定時はプロジェクトオーナー (horitapublic@gmail.com) を
    | フォールバック管理者として扱う。明示的に管理者を消したい場合は
    | ADMIN_EMAILS= (空文字) を env に設定する。
    |
    */

    'emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('ADMIN_EMAILS', 'horitapublic@gmail.com'))
    ))),

];
