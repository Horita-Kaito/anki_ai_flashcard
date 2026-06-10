<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Passport Guard
    |--------------------------------------------------------------------------
    |
    | Here you may specify which authentication guard Passport will use when
    | authenticating users. This value should correspond with one of your
    | guards that is already present in your "auth" configuration file.
    |
    */

    'guard' => 'web',

    'middleware' => [],

    /*
    |--------------------------------------------------------------------------
    | Encryption Keys
    |--------------------------------------------------------------------------
    |
    | Passport uses encryption keys while generating secure access tokens for
    | your application. By default, the keys are stored as local files but
    | can be set via environment variables when that is more convenient.
    |
    */

    // PEM をそのまま渡すか、改行を含められない env ファイル (docker compose の
    // env_file 等) 向けに単一行 base64 (*_B64) で渡すかの2系統をサポートする。
    'private_key' => env('PASSPORT_PRIVATE_KEY')
        ?: (($key = env('PASSPORT_PRIVATE_KEY_B64')) ? base64_decode((string) $key, true) : null),

    'public_key' => env('PASSPORT_PUBLIC_KEY')
        ?: (($key = env('PASSPORT_PUBLIC_KEY_B64')) ? base64_decode((string) $key, true) : null),

    /*
    |--------------------------------------------------------------------------
    | Passport Database Connection
    |--------------------------------------------------------------------------
    |
    | By default, Passport's models will utilize your application's default
    | database connection. If you wish to use a different connection you
    | may specify the configured name of the database connection here.
    |
    */

    'connection' => env('PASSPORT_CONNECTION'),

];
