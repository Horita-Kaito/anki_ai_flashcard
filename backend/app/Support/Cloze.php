<?php

declare(strict_types=1);

namespace App\Support;

/**
 * cloze 記法 `{{cN::answer}}` のテキスト処理。
 * フロントエンドの ClozeText / CLI の cloze.ts と同じ正規表現を使う。
 */
final class Cloze
{
    private const PATTERN = '/\{\{c\d+::([^}]*)\}\}/u';

    /**
     * cloze の中身 (= 答え) を空欄に置換する。
     * 出題側 (MCP など、レンダリングを自前で持たないクライアント) に
     * question を渡す前に必ず適用し、答えの露出を防ぐ。
     */
    public static function mask(string $text): string
    {
        return (string) preg_replace(self::PATTERN, '【____】', $text);
    }

    /**
     * cloze マーカーを含むかどうか。
     */
    public static function contains(string $text): bool
    {
        return preg_match(self::PATTERN, $text) === 1;
    }
}
