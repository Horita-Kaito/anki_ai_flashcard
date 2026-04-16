<?php

declare(strict_types=1);

namespace App\Services\AI;

use App\Enums\CardType;

/**
 * AI からの生応答テキストを構造化候補配列にパースする。
 * 不正な JSON、欠損フィールド、想定外の値に対して寛容にフォールバックする。
 */
final class CandidateParser
{
    /**
     * @return array<int, array{
     *   question: string,
     *   answer: string,
     *   card_type: string,
     *   focus_type: ?string,
     *   rationale: ?string,
     *   confidence: ?float,
     *   suggested_deck_id: ?int,
     * }>
     */
    public function parse(string $rawContent): array
    {
        $json = $this->extractJson($rawContent);
        if ($json === null) {
            return [];
        }

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        $list = $decoded['candidates'] ?? $decoded;
        if (! is_array($list)) {
            return [];
        }

        $out = [];
        foreach ($list as $item) {
            if (! is_array($item)) {
                continue;
            }
            $question = $this->strOrNull($item, 'question');
            $answer = $this->strOrNull($item, 'answer');
            if ($question === null || $answer === null || $question === '' || $answer === '') {
                continue;
            }

            $cardType = $this->strOrNull($item, 'card_type') ?? 'basic_qa';
            if (! in_array($cardType, CardType::values(), true)) {
                $cardType = 'basic_qa';
            }

            $confidence = $item['confidence'] ?? null;
            if ($confidence !== null) {
                $confidence = max(0.0, min(1.0, (float) $confidence));
            }

            $suggestedDeckId = $item['suggested_deck_id'] ?? null;
            if ($suggestedDeckId !== null) {
                $suggestedDeckId = is_numeric($suggestedDeckId) ? (int) $suggestedDeckId : null;
            }

            $out[] = [
                'question' => mb_substr($question, 0, 2000),
                'answer' => mb_substr($answer, 0, 2000),
                'card_type' => $cardType,
                'focus_type' => $this->strOrNull($item, 'focus_type'),
                'rationale' => $this->strOrNull($item, 'rationale'),
                'confidence' => $confidence,
                'suggested_deck_id' => $suggestedDeckId,
            ];
        }

        return $out;
    }

    /**
     * 応答文から JSON 部分を抽出する。
     * ```json ``` で囲まれている場合、前後に説明文がある場合も対応。
     */
    private function extractJson(string $content): ?string
    {
        $trimmed = trim($content);
        if ($trimmed === '') {
            return null;
        }

        // コードフェンスを除去
        if (preg_match('/```(?:json)?\s*(.+?)\s*```/s', $trimmed, $m)) {
            return trim($m[1]);
        }

        // 最初の { から最後の } までを抽出
        $start = strpos($trimmed, '{');
        $end = strrpos($trimmed, '}');
        if ($start !== false && $end !== false && $end > $start) {
            return substr($trimmed, $start, $end - $start + 1);
        }

        // 配列直下の場合
        $start = strpos($trimmed, '[');
        $end = strrpos($trimmed, ']');
        if ($start !== false && $end !== false && $end > $start) {
            return substr($trimmed, $start, $end - $start + 1);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $arr
     */
    private function strOrNull(array $arr, string $key): ?string
    {
        $v = $arr[$key] ?? null;
        if ($v === null) {
            return null;
        }

        return is_string($v) ? $v : (string) $v;
    }
}
