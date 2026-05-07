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
    */

    'emails' => array_values(array_filter(array_map(
        static fn (string $email): string => strtolower(trim($email)),
        explode(',', (string) env('ADMIN_EMAILS', ''))
    ))),

];
