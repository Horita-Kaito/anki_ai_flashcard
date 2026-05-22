<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Enums\CardType;

/**
 * AI に出力させる候補 JSON の構造を OpenAI 形式 (json_schema, strict=true) で記述する。
 *
 * これを response_format に渡すと、OpenAI は **スキーマに違反するレスポンスを返せなくなる**:
 *   - フィールドの欠落 → 起きない
 *   - card_type / focus_type の enum 違反 → 起きない
 *   - 文字列に数値が入る、数値に文字列が入る → 起きない
 *
 * これにより `[PARSE_ERROR]` / `invalidResponse` のうち、構造起因の失敗を構造的にゼロにできる。
 * truncate (max_tokens 超過) は依然として起こりうる点に注意。
 */
final class CandidateJsonSchema
{
    public const FOCUS_TYPES = [
        'definition',
        'purpose',
        'comparison',
        'practical_caution',
        'cause_effect',
        'example',
        'misconception',
    ];

    /**
     * OpenAI response_format に渡す配列を返す。
     *
     * @return array<string, mixed>
     */
    public static function forOpenAi(): array
    {
        return [
            'name' => 'card_candidates',
            'strict' => true,
            'schema' => [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => ['candidates'],
                'properties' => [
                    'candidates' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            // strict mode では全 properties が required に列挙される必要がある。
                            // nullable は type に "null" を含めて表現する。
                            'required' => [
                                'question',
                                'answer',
                                'explanation',
                                'card_type',
                                'focus_type',
                                'rationale',
                                'confidence',
                                'suggested_deck_id',
                            ],
                            'properties' => [
                                'question' => ['type' => 'string'],
                                'answer' => ['type' => 'string'],
                                'explanation' => ['type' => ['string', 'null']],
                                'card_type' => [
                                    'type' => 'string',
                                    'enum' => CardType::values(),
                                ],
                                'focus_type' => [
                                    'type' => ['string', 'null'],
                                    'enum' => [...self::FOCUS_TYPES, null],
                                ],
                                'rationale' => ['type' => ['string', 'null']],
                                'confidence' => ['type' => ['number', 'null']],
                                'suggested_deck_id' => ['type' => ['integer', 'null']],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
