<?php

declare(strict_types=1);

namespace App\Services\AI;

/**
 * CandidateParser::parse() の結果オブジェクト。
 * - items: 抽出できたカード候補配列 (1 件以上、空ならパーサが例外を投げる)
 * - truncated: AI 応答が途中で打ち切られて部分復元したかどうか
 * - debugDetail: 運用ログ用の補足 (truncated 時の長さ・末尾文字列など)
 */
final class ParseResult
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    public function __construct(
        public readonly array $items,
        public readonly bool $truncated,
        public readonly ?string $debugDetail = null,
    ) {}
}
