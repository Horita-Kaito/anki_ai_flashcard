<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default AI Provider
    |--------------------------------------------------------------------------
    | サポート値: openai | anthropic | google | fake (テスト用)
    */
    'default_provider' => env('DEFAULT_AI_PROVIDER', 'openai'),

    /*
    |--------------------------------------------------------------------------
    | Default Model
    |--------------------------------------------------------------------------
    */
    'default_model' => env('DEFAULT_AI_MODEL', 'gpt-4o-mini'),

    /*
    |--------------------------------------------------------------------------
    | Prompt Version
    |--------------------------------------------------------------------------
    | プロンプト仕様を変更する度にバンプする。生成ログに記録される。
    */
    'prompt_version' => env('AI_PROMPT_VERSION', 'v1.2'),

    /*
    |--------------------------------------------------------------------------
    | Provider API Keys
    |--------------------------------------------------------------------------
    */
    'providers' => [
        'openai' => [
            'api_key' => env('OPENAI_API_KEY'),
            'base_uri' => env('OPENAI_BASE_URI', 'https://api.openai.com/v1'),
            'timeout' => (int) env('OPENAI_TIMEOUT', 30),
        ],
        'anthropic' => [
            'api_key' => env('ANTHROPIC_API_KEY'),
            'base_uri' => env('ANTHROPIC_BASE_URI', 'https://api.anthropic.com/v1'),
            'timeout' => (int) env('ANTHROPIC_TIMEOUT', 30),
        ],
        'google' => [
            'api_key' => env('GOOGLE_AI_API_KEY'),
            'base_uri' => env('GOOGLE_AI_BASE_URI', 'https://generativelanguage.googleapis.com/v1beta'),
            'timeout' => (int) env('GOOGLE_AI_TIMEOUT', 30),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Generation Policy
    |--------------------------------------------------------------------------
    */
    'generation' => [
        'default_candidate_count' => (int) env('AI_DEFAULT_CANDIDATE_COUNT', 3),
        'max_candidate_count' => (int) env('AI_MAX_CANDIDATE_COUNT', 10),
        'max_retries' => (int) env('AI_MAX_RETRIES', 2),
        'temperature' => (float) env('AI_TEMPERATURE', 0.6),
        'max_output_tokens' => (int) env('AI_MAX_OUTPUT_TOKENS', 2000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Pricing Table (USD / 1M tokens)
    |--------------------------------------------------------------------------
    | コスト計算に使用。モデル追加時はここに料金を追記。
    | 未登録モデルは 0 として記録される (警告対象)。
    */
    'pricing' => [
        'openai' => [
            'gpt-4o-mini' => ['input' => 0.15, 'output' => 0.60],
            'gpt-4o' => ['input' => 2.50, 'output' => 10.00],
            'gpt-4.1-mini' => ['input' => 0.40, 'output' => 1.60],
            'gpt-4.1' => ['input' => 2.00, 'output' => 8.00],
        ],
        'anthropic' => [
            'claude-3-5-haiku-latest' => ['input' => 0.80, 'output' => 4.00],
            'claude-3-5-sonnet-latest' => ['input' => 3.00, 'output' => 15.00],
            'claude-sonnet-4-5' => ['input' => 3.00, 'output' => 15.00],
            'claude-opus-4' => ['input' => 15.00, 'output' => 75.00],
        ],
        'google' => [
            'gemini-2.5-flash' => ['input' => 0.15, 'output' => 0.60],
            'gemini-2.5-pro' => ['input' => 1.25, 'output' => 10.00],
            'gemini-2.0-flash' => ['input' => 0.10, 'output' => 0.40],
            'gemini-2.5-flash-lite' => ['input' => 0.075, 'output' => 0.30],
            'gemini-2.0-flash-lite' => ['input' => 0.075, 'output' => 0.30],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Review Settings
    |--------------------------------------------------------------------------
    */
    'review' => [
        'archive_interval_days' => (int) env('REVIEW_ARCHIVE_INTERVAL_DAYS', 180),
    ],

    /*
    |--------------------------------------------------------------------------
    | Usage Limits (per user, per day)
    |--------------------------------------------------------------------------
    | 将来の収益化で plan 別に拡張。現状は全ユーザー共通の安全側上限。
    */
    'limits' => [
        'daily_generation_calls' => (int) env('AI_DAILY_GENERATION_LIMIT', 100),
    ],
];
