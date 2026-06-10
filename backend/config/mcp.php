<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Redirect Domains
    |--------------------------------------------------------------------------
    |
    | OAuth 動的クライアント登録 (POST /oauth/register) で許可するリダイレクト先。
    | staging を本番相当で運用する方針のため '*' は使わず、既知のコネクタ提供元
    | ドメインのみ許可する。コネクタ側の仕様変更は MCP_REDIRECT_DOMAINS 環境変数
    | (カンマ区切り) で追従できる。
    |
    */

    'redirect_domains' => array_map('trim', explode(',', (string) env(
        'MCP_REDIRECT_DOMAINS',
        'https://claude.ai,https://claude.com,https://chatgpt.com,https://chat.openai.com,http://localhost,http://127.0.0.1',
    ))),

    /*
    |--------------------------------------------------------------------------
    | Allowed Custom Schemes
    |--------------------------------------------------------------------------
    |
    | ネイティブ MCP クライアント (RFC 8252 の private-use URI scheme) 用。
    |
    */

    'custom_schemes' => [
        'claude',
        'cursor',
        'vscode',
    ],

    /*
    |--------------------------------------------------------------------------
    | Authorization Server
    |--------------------------------------------------------------------------
    |
    | RFC 8414 の issuer identifier。null の場合は url('/')。
    |
    */

    'authorization_server' => null,

];
