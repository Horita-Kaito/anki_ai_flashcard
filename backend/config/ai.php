<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default AI Provider
    |--------------------------------------------------------------------------
    | サポート値: openai | anthropic | google
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
    ],
];
